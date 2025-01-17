use std::{cmp::Ordering, marker::PhantomData};

use bytemuck::{Pod, Zeroable};
use hash::compute_root;
use light_hasher::Hasher;

pub mod changelog;
pub mod errors;
pub mod hash;

use crate::{
    changelog::ChangelogEntry, errors::ConcurrentMerkleTreeError, hash::compute_parent_node,
};

/// [Concurrent Merkle tree](https://drive.google.com/file/d/1BOpa5OFmara50fTvL0VIVYjtg-qzHCVc/view)
/// which allows for multiple requests of updating leaves, without making any
/// of the requests invalid, as long as they are not:
///
/// * Modyfing the same leaf.
/// * Exceeding the capacity of the `changelog` (`MAX_CHANGELOG`).
///
/// When any of the above happens, some of the concurrent requests are going to
/// be invalid, forcing the clients to re-generate the Merkle proof. But that's
/// still better than having such a failure after any update happening in the
/// middle of requesting the update.
///
/// Due to ability to make a decent number of concurrent update requests to be
/// valid, no lock is necessary.
#[repr(C)]
#[derive(Copy, Clone)]
pub struct ConcurrentMerkleTree<
    H,
    const HEIGHT: usize,
    const MAX_CHANGELOG: usize,
    const MAX_ROOTS: usize,
> where
    H: Hasher,
{
    /// Index of the newest non-empty leaf.
    pub next_index: u64,
    /// History of roots.
    pub roots: [[u8; 32]; MAX_ROOTS],
    /// Number of successful operations on the tree.
    pub sequence_number: u64,
    /// History of Merkle proofs.
    pub changelog: [ChangelogEntry<HEIGHT>; MAX_CHANGELOG],
    /// Index of the newest changelog.
    pub current_changelog_index: u64,
    /// Index of the newest root.
    pub current_root_index: u64,
    /// The newest Merkle proof.
    pub rightmost_proof: [[u8; 32]; HEIGHT],
    /// The newest non-empty leaf.
    pub rightmost_leaf: [u8; 32],

    _hasher: PhantomData<H>,
}

impl<H, const HEIGHT: usize, const MAX_CHANGELOG: usize, const MAX_ROOTS: usize> Default
    for ConcurrentMerkleTree<H, HEIGHT, MAX_CHANGELOG, MAX_ROOTS>
where
    H: Hasher,
{
    fn default() -> Self {
        Self {
            changelog: [ChangelogEntry::default(); MAX_CHANGELOG],
            current_changelog_index: 0,
            roots: [[0u8; 32]; MAX_ROOTS],
            sequence_number: 0,
            current_root_index: 0,
            rightmost_proof: [[0u8; 32]; HEIGHT],
            next_index: 0,
            rightmost_leaf: [0u8; 32],
            _hasher: PhantomData,
        }
    }
}

/// Mark `ConcurrentMerkleTree` as `Zeroable`, providing Anchor a guarantee
/// that it can be always initialized with zeros.
///
/// # Safety
///
/// [`bytemuck`](bytemuck) is not able to ensure that our custom types (`Hasher`
/// and `ConcurrentMerkleTree`) can be a subject of initializing with zeros. It
/// also doesn't support structs with const generics (it would need to ensure
/// alignment).
///
/// Therefore, it's our responsibility to guarantee that `ConcurrentMerkleTree`
/// doesn't contain any fields which are not zeroable.
unsafe impl<H, const HEIGHT: usize, const MAX_CHANGELOG: usize, const MAX_ROOTS: usize> Zeroable
    for ConcurrentMerkleTree<H, HEIGHT, MAX_CHANGELOG, MAX_ROOTS>
where
    H: Hasher,
{
}

/// Mark `ConcurrentMerkleTree` as `Pod` (Plain Old Data), providing Anchor a
/// guarantee that it can be used in a zero-copy account.
///
/// # Safety
///
/// [`bytemuck`](bytemuck) is not able to ensure that our custom types (`Hasher`
/// and `ConcurrentMerkleTree`) can be a subject of byte serialization. It also
/// doesn't support structs with const generics (it would need to ensure
/// alignment).
///
/// Therefore, it's our responsibility to guarantee that:
///
/// * `Hasher` and `ConcurrentMerkleTree` with given const generics are aligned.
/// * They don't contain any fields which are not implementing `Copy` or are
///   not an easy subject for byte serialization.
unsafe impl<H, const HEIGHT: usize, const MAX_CHANGELOG: usize, const MAX_ROOTS: usize> Pod
    for ConcurrentMerkleTree<H, HEIGHT, MAX_CHANGELOG, MAX_ROOTS>
where
    H: Hasher + Copy + 'static,
{
}

impl<H, const HEIGHT: usize, const MAX_CHANGELOG: usize, const MAX_ROOTS: usize>
    ConcurrentMerkleTree<H, HEIGHT, MAX_CHANGELOG, MAX_ROOTS>
where
    H: Hasher,
{
    /// Initializes the Merkle tree.
    pub fn init(&mut self) -> Result<(), ConcurrentMerkleTreeError> {
        // Initialize changelog.
        let root = H::zero_bytes()[HEIGHT];
        let mut changelog_path = [[0u8; 32]; HEIGHT];
        for (i, node) in changelog_path.iter_mut().enumerate() {
            *node = H::zero_bytes()[i];
        }
        let changelog_entry = ChangelogEntry::new(root, changelog_path, 0);
        if let Some(changelog_element) = self.changelog.get_mut(0) {
            *changelog_element = changelog_entry;
        }

        // Initialize root.
        *self
            .roots
            .get_mut(0)
            .ok_or(ConcurrentMerkleTreeError::RootsZero)? = root;

        // Initialize rightmost proof.
        for (i, node) in self.rightmost_proof.iter_mut().enumerate() {
            *node = H::zero_bytes()[i];
        }

        Ok(())
    }

    /// Increments the changelog counter. If it reaches the limit, it starts
    /// from the beginning.
    fn inc_current_changelog_index(&mut self) {
        // NOTE(vadorovsky): Apparenty, Rust doesn't have `checked_remainder`
        // or anything like that.
        self.current_changelog_index = if MAX_CHANGELOG > 0 {
            (self.current_changelog_index + 1) % MAX_CHANGELOG as u64
        } else {
            0
        };
    }

    /// Increments the root counter. If it reaches the limit, it starts from
    /// the beginning.
    fn inc_current_root_index(&mut self) {
        self.current_root_index = (self.current_root_index + 1) % MAX_ROOTS as u64;
    }

    /// Returns the index of the current changelog entry.
    pub fn changelog_index(&self) -> usize {
        self.current_changelog_index as usize
    }

    /// Returns the index of the current root in the tree's root buffer.
    pub fn root_index(&self) -> usize {
        self.current_root_index as usize
    }

    /// Returns the current root.
    pub fn root(&self) -> Result<[u8; 32], ConcurrentMerkleTreeError> {
        self.roots
            .get(self.current_root_index as usize)
            .ok_or(ConcurrentMerkleTreeError::RootHigherThanMax)
            .copied()
    }

    /// Returns an updated Merkle proof.
    ///
    /// The update is performed by checking whether there are any new changelog
    /// entries and whether they contain changes which affect the current
    /// proof. To be precise, for each changelog entry, it's done in the
    /// following steps:
    ///
    /// * Check if the changelog entry was directly updating the `leaf_index`
    ///   we are trying to update.
    ///   * If no (we check that condition first, since it's more likely),
    ///     it means that there is a change affecting the proof, but not the
    ///     leaf.
    ///     Check which element from our proof was affected by the change
    ///     (using the `critbit_index` method) and update it (copy the new
    ///     element from the changelog to our updated proof).
    ///   * If yes, it means that the same leaf we want to update was already
    ///     updated. In such case, updating the proof is not possible.
    fn update_proof(
        &self,
        changelog_index: usize,
        leaf_index: usize,
        proof: &[[u8; 32]; HEIGHT],
    ) -> Option<[[u8; 32]; HEIGHT]> {
        let mut updated_proof = proof.to_owned();

        let mut i = changelog_index + 1;

        while i != self.current_changelog_index as usize + 1 {
            let changelog_entry = self.changelog[i];

            updated_proof = match changelog_entry.update_proof(leaf_index, &updated_proof) {
                Some(proof) => proof,
                None => return None,
            };

            i = (i + 1) % MAX_ROOTS;
        }

        Some(updated_proof)
    }

    /// Checks whether the given Merkle `proof` for the given `node` (with index
    /// `i`) is valid. The proof is valid when computing parent node hashes using
    /// the whole path of the proof gives the same result as the given `root`.
    pub fn validate_proof(
        &self,
        leaf: &[u8; 32],
        leaf_index: usize,
        proof: &[[u8; 32]; HEIGHT],
    ) -> Result<(), ConcurrentMerkleTreeError> {
        let computed_root = compute_root::<H, HEIGHT>(leaf, leaf_index, proof)?;
        if computed_root == self.root()? {
            Ok(())
        } else {
            Err(ConcurrentMerkleTreeError::InvalidProof)
        }
    }

    /// Updates the leaf under `leaf_index` with the `new_leaf` value.
    ///
    /// 1. Computes the new path and root from `new_leaf` and Merkle proof
    ///    (`proof`).
    /// 2. Stores the new path as the latest changelog entry and increments the
    ///    latest changelog index.
    /// 3. Stores the latest root and increments the latest root index.
    /// 4. If new leaf is at the rightmost index, stores it as the new
    ///    rightmost leaft and stores the Merkle proof as the new rightmost
    ///    proof.
    ///
    /// # Validation
    ///
    /// This method doesn't validate the proof. Caller is responsible for
    /// doing that before.
    fn update_leaf_in_tree(
        &mut self,
        new_leaf: &[u8; 32],
        leaf_index: usize,
        proof: &[[u8; 32]; HEIGHT],
    ) -> Result<ChangelogEntry<HEIGHT>, ConcurrentMerkleTreeError> {
        let mut node = *new_leaf;
        let mut changelog_path = [[0u8; 32]; HEIGHT];

        for (j, sibling) in proof.iter().enumerate() {
            changelog_path[j] = node;
            node = compute_parent_node::<H>(&node, sibling, leaf_index, j)?;
        }

        let changelog_entry = ChangelogEntry::new(node, changelog_path, leaf_index);
        self.inc_current_changelog_index();
        if let Some(changelog_element) = self
            .changelog
            .get_mut(self.current_changelog_index as usize)
        {
            *changelog_element = changelog_entry
        }

        self.inc_current_root_index();
        *self
            .roots
            .get_mut(self.current_root_index as usize)
            .ok_or(ConcurrentMerkleTreeError::RootsZero)? = node;

        // Update the rightmost proof. It has to be done only if tree is not full.
        if self.next_index < (1 << HEIGHT) {
            if self.next_index > 0 && leaf_index < self.next_index as usize - 1 {
                // Update the rightmost proof with the current changelog entry when:
                //
                // * `rightmost_index` is greater than 0 (tree is non-empty).
                // * The updated leaf is non-rightmost.
                if let Some(proof) = changelog_entry
                    .update_proof(self.next_index as usize - 1, &self.rightmost_proof)
                {
                    self.rightmost_proof = proof;
                }
            } else {
                // Save the provided proof and leaf as the new rightmost under
                // any of the following conditions:
                //
                // * Tree is empty (and this is the first `append`).
                // * The rightmost leaf is updated.
                self.rightmost_proof.copy_from_slice(proof);
                self.rightmost_leaf = *new_leaf;
            }
        }

        Ok(changelog_entry)
    }

    /// Replaces the `old_leaf` under the `leaf_index` with a `new_leaf`, using
    /// the given `proof` and `changelog_index` (pointing to the changelog entry
    /// which was the newest at the time of preparing the proof).
    pub fn update(
        &mut self,
        changelog_index: usize,
        old_leaf: &[u8; 32],
        new_leaf: &[u8; 32],
        leaf_index: usize,
        proof: &[[u8; 32]; HEIGHT],
    ) -> Result<ChangelogEntry<HEIGHT>, ConcurrentMerkleTreeError> {
        let updated_proof = if self.next_index > 0 && MAX_CHANGELOG > 0 {
            match self.update_proof(changelog_index, leaf_index, proof) {
                Some(proof) => proof,
                // This case means that the leaf we are trying to update was
                // already updated. Therefore, updating the proof is impossible.
                // We need to return an error and request the caller
                // to retry the update with a new proof.
                None => {
                    return Err(ConcurrentMerkleTreeError::CannotUpdateLeaf);
                }
            }
        } else {
            if leaf_index != self.next_index as usize {
                return Err(ConcurrentMerkleTreeError::AppendOnly);
            }
            proof.to_owned()
        };

        self.validate_proof(old_leaf, leaf_index, proof)?;
        self.update_leaf_in_tree(new_leaf, leaf_index, &updated_proof)
    }

    /// Appends a new leaf to the tree with the given `changelog_entry` to save
    /// the Merkle path in.
    fn append_with_changelog_entry(
        &mut self,
        leaf: &[u8; 32],
        changelog_entry: &mut ChangelogEntry<HEIGHT>,
    ) -> Result<(), ConcurrentMerkleTreeError> {
        if self.next_index >= 1 << HEIGHT {
            return Err(ConcurrentMerkleTreeError::TreeFull);
        }

        let mut current_node = *leaf;
        let mut intersection_node = self.rightmost_leaf;
        // The highest index of our currently computed Merkle path which is not
        // affected by the Merkle path of the last append.
        //
        // For example, let's imagine this tree, where there are
        // two non-zero leaves:
        //
        //          H2
        //      /-/    \-\
        //    H1          Z[1]
        //  /    \      /      \
        // L1    L2   Z[0]    Z[0]
        //
        // Let's assume that we are starting to append the 3rd leaf. The
        // Merkle path of that append will consist of the following nodes
        // marked by `M`. Nodes marked by `X` belong to one of the previous
        // Merkle paths. Node marked by `Z` is a zero leaf which doesn't
        // belong to any path.
        //
        //       M3
        //    /-/  \-\
        //   X        M2
        //  / \      /  \
        // X   X    M1   Z
        //
        // We can write the Merkle path as an array, from the leaf to the
        // uppermost node:
        //
        // [M1, **M2**, M3]
        //  (1) **(2)** (3)
        //
        // The only node which was affected by previous appends is M3, because
        // it was part of the Merkle path of the previous append.
        //
        // Therefore, the intersection node is M2 and the intersection index is
        // 2.
        let intersection_index = self.next_index.trailing_zeros() as usize;
        let node_index = if self.next_index > 1 {
            self.next_index as usize - 1
        } else {
            0
        };
        let mut changelog_path = [[0u8; 32]; HEIGHT];

        for (i, item) in changelog_path.iter_mut().enumerate() {
            *item = current_node;

            match i.cmp(&intersection_index) {
                Ordering::Less => {
                    let empty_node = H::zero_bytes()[i];
                    current_node = H::hashv(&[&current_node, &empty_node])?;
                    intersection_node = compute_parent_node::<H>(
                        &intersection_node,
                        &self.rightmost_proof[i],
                        node_index,
                        i,
                    )?;
                    self.rightmost_proof[i] = empty_node;
                }
                Ordering::Equal => {
                    current_node = H::hashv(&[&intersection_node, &current_node])?;
                    self.rightmost_proof[intersection_index] = intersection_node;
                }
                Ordering::Greater => {
                    current_node = compute_parent_node::<H>(
                        &current_node,
                        &self.rightmost_proof[i],
                        node_index,
                        i,
                    )?;
                }
            }
        }

        changelog_entry.root = current_node;
        changelog_entry.path = changelog_path;
        changelog_entry.index = self.next_index;

        self.inc_current_changelog_index();
        if let Some(changelog_element) = self
            .changelog
            .get_mut(self.current_changelog_index as usize)
        {
            *changelog_element = *changelog_entry;
        }
        self.inc_current_root_index();
        *self
            .roots
            .get_mut(self.current_root_index as usize)
            .ok_or(ConcurrentMerkleTreeError::RootsZero)? = current_node;

        self.sequence_number = self.sequence_number.saturating_add(1);
        self.next_index = self.next_index.saturating_add(1);
        self.rightmost_leaf = *leaf;

        Ok(())
    }

    /// Appends a new leaf to the tree.
    pub fn append(
        &mut self,
        leaf: &[u8; 32],
    ) -> Result<ChangelogEntry<HEIGHT>, ConcurrentMerkleTreeError> {
        let mut changelog_entry = ChangelogEntry::default();
        self.append_with_changelog_entry(leaf, &mut changelog_entry)?;
        Ok(changelog_entry)
    }

    /// Appends a new batch of leaves to the tree.
    pub fn append_batch(
        &mut self,
        leaves: &[&[u8; 32]],
    ) -> Result<Vec<Box<ChangelogEntry<HEIGHT>>>, ConcurrentMerkleTreeError> {
        let mut changelog_entries: Vec<Box<ChangelogEntry<HEIGHT>>> = Vec::new();

        for leaf in leaves.iter() {
            let mut changelog_entry = Box::<ChangelogEntry<HEIGHT>>::default();
            self.append_with_changelog_entry(leaf, &mut changelog_entry)?;
            changelog_entries.push(changelog_entry);
        }
        Ok(changelog_entries)
    }
}
