import React, { useState, useEffect, useRef } from 'react';
import { X, Save, UploadCloud, Trash2 } from 'lucide-react';
import type { Post, Category, PostFormData } from '../types';

interface PostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: PostFormData) => Promise<void>;
  categories: Category[];
  editingPost?: Post | null;
  isLoading?: boolean;
}

const PostForm: React.FC<PostFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  editingPost,
  isLoading = false
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (editingPost) {
            setTitle(editingPost.title);
            setContent(editingPost.content);
            setCategoryId(editingPost.category_id);
            setImagePreview(editingPost.image_url || null);
            setImageFile(null);
        } else {
            setTitle('');
            setContent('');
            setCategoryId(categories[0]?.id || 1);
            setImageFile(null);
            setImagePreview(null);
        }
        setErrors({});
    }
  }, [editingPost, categories, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (!content.trim()) newErrors.content = 'Content is required.';
    if (!categoryId) newErrors.category_id = 'Please select a category.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onSubmit({ title, content, category_id: categoryId, image: imageFile });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
      setImageFile(null);
      setImagePreview(null);
      // Also clear the ref so the same file can be re-selected
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-5 pb-3 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {editingPost ? 'Edit Post' : 'Create New Post'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" disabled={isLoading}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)}
                className={`input-field ${errors.title ? 'border-red-500' : ''}`} placeholder="Enter post title"
                disabled={isLoading}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                id="category_id" name="category_id" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}
                className={`input-field ${errors.category_id ? 'border-red-500' : ''}`} disabled={isLoading}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    {imagePreview ? (
                        <div className='relative group'>
                            <img src={imagePreview} alt="Preview" className="mx-auto h-40 w-auto rounded-md object-cover"/>
                            <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button type='button' onClick={removeImage} className='btn-danger p-2 rounded-full'><Trash2 className='h-5 w-5'/></button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" ref={fileInputRef} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </>
                    )}
                </div>
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              id="content" name="content" value={content} onChange={(e) => setContent(e.target.value)}
              rows={10} className={`input-field ${errors.content ? 'border-red-500' : ''}`} placeholder="Enter post content"
              disabled={isLoading}
            />
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
          </div>

          <div className="flex justify-end space-x-4 pt-5">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn-primary disabled:opacity-50 flex items-center" disabled={isLoading}>
              {isLoading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{editingPost ? 'Updating...' : 'Creating...'}</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />{editingPost ? 'Update Post' : 'Create Post'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostForm;
