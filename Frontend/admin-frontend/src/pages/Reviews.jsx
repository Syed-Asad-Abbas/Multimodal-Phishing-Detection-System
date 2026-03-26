import React, { useState, useEffect } from "react";
import { Card, Badge, Avatar, AvatarFallback, Button } from "../components/ui/Primitives";
import { Star, CheckCircle, XCircle, Clock } from "lucide-react";
import api from "../services/api";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reviews/admin/all');
      setReviews(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/reviews/admin/${id}/status`, { status });
      // Refresh list
      fetchReviews();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success" className="px-2 py-0.5"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED': return <Badge variant="danger" className="px-2 py-0.5"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="warning" className="px-2 py-0.5"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading reviews...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Reviews Moderation</h1>
          <p className="text-slate-400">Manage client feedback and approve testimonials.</p>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid gap-6">
        {reviews.length === 0 ? (
          <div className="text-slate-400">No reviews found.</div>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-6 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-400">
                      {review.user?.email ? review.user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-white">{review.user?.email || `User #${review.user_id}`}</h4>
                    <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(review.status)}
                </div>
              </div>

              <div className="flex text-yellow-500 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-slate-700"}`} />
                ))}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                "{review.comment}"
              </p>

              <div className="flex gap-4 border-t border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 font-medium ${review.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' : 'hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50'}`}
                  onClick={() => handleUpdateStatus(review.id, 'APPROVED')}
                  disabled={review.status === 'APPROVED'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {review.status === 'APPROVED' ? 'Approved' : 'Approve'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 font-medium ${review.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50'}`}
                  onClick={() => handleUpdateStatus(review.id, 'REJECTED')}
                  disabled={review.status === 'REJECTED'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {review.status === 'REJECTED' ? 'Rejected' : 'Reject'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
