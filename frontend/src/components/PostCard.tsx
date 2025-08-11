import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Eye, ThumbsUp } from 'lucide-react';
import type { Post } from '../types';
import DOMPurify from 'dompurify';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  showActions?: boolean;
  currentUserId?: number | null;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onEdit,
  onDelete,
  showActions = true,
  currentUserId
}) => {
  const canPerformActions = currentUserId === post.author.id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const createMarkup = (htmlContent: string) => {
    const truncatedContent = htmlContent.length > 150 ? htmlContent.substring(0, 150) + '...' : htmlContent;
    const sanitizedContent = DOMPurify.sanitize(truncatedContent);
    return { __html: sanitizedContent };
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit?.(post);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(post);
  };

  return (
    <Link to={`/posts/${post.id}`} className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out">
      {post.image_url && (
        <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {post.category.name}
          </span>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1.5" />
            {formatDate(post.created_at)}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
          {post.title}
        </h3>

        <div
          className="text-gray-700 mb-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={createMarkup(post.content)}
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1.5" />
            <span>{post.author.username}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1.5" />
              <span>{post.view_count}</span>
            </div>
            <div className="flex items-center">
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              <span>{post.like_count}</span>
            </div>
          </div>
        </div>

        {showActions && canPerformActions && (
          <div className="flex justify-end items-center mt-4 pt-4 border-t border-gray-200 space-x-3">
            <button
              onClick={handleEditClick}
              className="btn-secondary"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </Link>
  );
};

export default PostCard;