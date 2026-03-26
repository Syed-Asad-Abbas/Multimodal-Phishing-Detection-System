import React, { useState, useEffect } from "react";
import { Card, Button, Input, Badge } from "../components/ui/Primitives";
import { Shield, Star, Loader2 } from "lucide-react";
import api from "../services/api";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/my');
      setReviews(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/reviews', { rating, comment });
      setShowForm(false);
      setComment("");
      setRating(5);
      fetchReviews();
    } catch (err) {
      alert("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Reviews</h1>
      {showForm ? (
        <Card className="border-slate-800 bg-slate-900/30 p-8">
          <h2 className="text-xl font-bold mb-4">Submit a Review</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-lg transition-colors ${rating >= star ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Your Feedback</label>
              <textarea
                className="w-full h-32 bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                placeholder="Share your experience using PhishGuard..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>Submit Review</Button>
            </div>
          </form>
        </Card>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/30">
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Shield className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto">You haven't submitted any feedback for the platform yet. Help us improve by sharing your thoughts.</p>
            <Button onClick={() => setShowForm(true)}>Start Reviewing</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowForm(true)}>Write another review</Button>
          </div>
          {reviews.map(rev => (
            <Card key={rev.id} className="border-slate-800 bg-slate-900/40 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < rev.rating ? 'fill-current' : 'text-slate-600 fill-transparent'}`} />
                  ))}
                </div>
                <Badge variant={rev.status === 'APPROVED' ? 'success' : rev.status === 'REJECTED' ? 'danger' : 'warning'}>
                  {rev.status}
                </Badge>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{rev.comment}</p>
              <div className="mt-4 text-xs text-slate-500">
                Submitted on {new Date(rev.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
