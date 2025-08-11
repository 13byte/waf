import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../utils/api';
import type { Post, Comment, User } from '../types';
import { Calendar, User as UserIcon, ArrowLeft, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        const postResponse = await apiClient.getPost(Number(id));
        if (postResponse.data) {
          setPost(postResponse.data);
        } else {
          throw new Error(postResponse.error || 'Post not found');
        }

        const commentsResponse = await apiClient.getComments(Number(id));
        if (commentsResponse.data) {
          setComments(commentsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post details');
      }

      setIsLoading(false);
    };

    fetchPostDetails();
  }, [id]);

  const createMarkup = (htmlContent: string) => {
    const sanitizedContent = DOMPurify.sanitize(htmlContent, { USE_PROFILES: { html: true } });
    return { __html: sanitizedContent };
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading post...</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  }

  if (!post) {
    return <div className="text-center py-20">Post not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/posts" className="inline-flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to all posts
        </Link>
      </div>

      <article className="bg-white rounded-lg shadow-lg overflow-hidden">
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="w-full h-96 object-cover" />
        )}
        <div className="p-8">
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {post.category.name}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <div className="flex items-center mr-6">
              <UserIcon className="h-4 w-4 mr-1.5" />
              <span>{post.author.username}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1.5" />
              <span>{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div 
            className="prose prose-lg max-w-none text-gray-800"
            dangerouslySetInnerHTML={createMarkup(post.content)}
          />
        </div>
      </article>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <MessageSquare className="h-6 w-6 mr-3 text-blue-600"/>
            Comments ({comments.length})
        </h2>
        <div className="space-y-6">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    <UserIcon className="h-10 w-10 text-gray-400 p-2 bg-gray-100 rounded-full"/>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-800">{comment.author.username}</p>
                        <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default PostDetailPage;
