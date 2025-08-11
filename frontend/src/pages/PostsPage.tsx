import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { FileText, Plus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import type { Post, Category, PostFormData } from '../types';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';

// --- Helper Components ---
const Toast = ({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void; }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  const style = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircle : XCircle;
  return (
    <div className={`fixed bottom-5 right-5 text-white px-4 py-3 rounded-lg shadow-lg flex items-center ${style} z-50`}>
      <Icon className="h-5 w-5 mr-2" />
      <span>{message}</span>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const PostsPage: React.FC = () => {
  const { state: authState } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [filters, setFilters] = useState({ query: '', categoryId: null as number | null });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; post: Post | null }>({ isOpen: false, post: null });

  const POSTS_PER_PAGE = 10;

  // Data fetching effect based on dependencies
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      const params = {
        skip: (page - 1) * POSTS_PER_PAGE,
        limit: POSTS_PER_PAGE,
        ...(filters.query && { search: filters.query }),
        ...(filters.categoryId && { category_id: filters.categoryId })
      };
      const response = await apiClient.getPosts(params);
      if (response.data) {
        const paginatedData = response.data as any;
        setPosts(paginatedData.posts || paginatedData);
        const totalItems = paginatedData.total || paginatedData.length;
        setTotalPosts(totalItems);
        setTotalPages(Math.ceil(totalItems / POSTS_PER_PAGE));
      } else {
        setError(response.error || 'Failed to fetch posts');
        setPosts([]); // Clear posts on error
      }
      setIsLoading(false);
    };
    fetchPosts();
  }, [page, filters]);

  // Initial category load
  useEffect(() => {
    const fetchCategories = async () => {
      const catResponse = await apiClient.getCategories();
      if (catResponse.data) setCategories(catResponse.data);
    };
    fetchCategories();
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setPage(1); // Reset to page 1 on new filter
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleFormSubmit = async (formData: PostFormData) => {
    setFormLoading(true);
    const apiCall = editingPost
      ? apiClient.updatePost(editingPost.id, formData)
      : apiClient.createPost(formData);
    const response = await apiCall;

    if (response.data) {
      if (editingPost) {
        setPosts(posts.map(p => p.id === response.data!.id ? response.data! : p));
        setToast({ message: 'Post updated successfully!', type: 'success' });
      } else {
        // Go to page 1 to see the new post
        if(page === 1) {
            setPosts([response.data, ...posts]);
        } else {
            setPage(1);
        }
        setToast({ message: 'Post created successfully!', type: 'success' });
      }
      setIsFormOpen(false);
    } else {
      setToast({ message: response.error || 'Failed to save post.', type: 'error' });
    }
    setFormLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteModal.post) return;
    const response = await apiClient.deletePost(deleteModal.post.id);
    if (response.error) {
      setToast({ message: response.error, type: 'error' });
    } else {
      setPosts(posts.filter(p => p.id !== deleteModal.post!.id));
      setTotalPosts(prev => prev - 1);
      setToast({ message: 'Post deleted successfully!', type: 'success' });
    }
    setDeleteModal({ isOpen: false, post: null });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <ConfirmationModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, post: null })} onConfirm={confirmDelete} title="Delete Post" message={`Are you sure you want to delete \"${deleteModal.post?.title}\"?`}/>
      <PostForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} categories={categories} editingPost={editingPost} isLoading={formLoading} />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-600 mt-1">Manage and browse all posts.</p>
        </div>
        {authState.user && <button onClick={() => { setEditingPost(null); setIsFormOpen(true); }} className="btn-primary"><Plus className="h-5 w-5 mr-2"/>New Post</button>}
      </div>

      <div className="mb-6">
        <SearchBar onSearch={(q) => handleFilterChange({ query: q })} onCategoryFilter={(id) => handleFilterChange({ categoryId: id })} categories={categories} />
      </div>

      {isLoading && posts.length === 0 ? (
        <p className="text-center py-12">Loading...</p>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-lg font-medium">Failed to load posts</h3>
            <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new post.</p>
        </div>
      ) : (
        <Fragment>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onEdit={(p) => { setEditingPost(p); setIsFormOpen(true); }} onDelete={(p) => setDeleteModal({ isOpen: true, post: p })} currentUserId={authState.user?.id} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Fragment>
      )}
    </div>
  );
};

export default PostsPage;
