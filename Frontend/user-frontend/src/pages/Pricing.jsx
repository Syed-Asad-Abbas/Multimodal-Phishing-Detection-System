import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Zap, Shield, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Primitives";
import api from "../services/api";
import { toast } from "react-toastify";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState("FREE");

  useEffect(() => {
    // Fetch current user tier
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.user) {
          setCurrentTier(res.data.user.subscription_tier);
        }
      } catch (err) {
        console.error("Failed to fetch user tier", err);
      }
    };
    fetchUser();
  }, []);

  const handleSubscribe = async (tier) => {
    try {
      setLoading(true);
      const res = await api.post('/payments/checkout-session', { tier });
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      tier: "FREE",
      price: "$0",
      period: "/forever",
      description: "Basic phishing detection for personal use.",
      features: [
        "100 Scans per month",
        "Standard ML Models",
        "Dashboard Access",
        "Community Support",
      ],
      notIncluded: [
        "API Access",
        "Priority Scanning",
      ],
      icon: <Shield className="w-6 h-6 text-slate-400" />,
      color: "from-slate-500 to-slate-700",
      buttonVariant: "outline",
    },
    {
      name: "Pro",
      tier: "PRO",
      price: "$19",
      period: "/month",
      description: "Advanced protection & API access for developers.",
      features: [
        "10,000 Scans per month",
        "Programmatic API Key Access",
        "Advanced LLM Explanations",
        "Faster Processing Times",
        "Email Support",
      ],
      notIncluded: [],
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      color: "from-cyan-500 to-blue-600",
      buttonVariant: "primary",
      popular: true,
    },
    {
      name: "Pro Max",
      tier: "PRO_MAX",
      price: "$49",
      period: "/month",
      description: "Enterprise grade protection with unlimited limits.",
      features: [
        "Unlimited Scans",
        "Programmatic API Key Access",
        "Advanced LLM Explanations",
        "Highest Priority Processing",
        "24/7 Priority Support",
      ],
      notIncluded: [],
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-400 to-teal-600",
      buttonVariant: "primary",
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Choose the right plan to protect yourself or your business from sophisticated multimodal phishing attacks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl border ${plan.popular ? 'border-cyan-500 shadow-[0_0_40px_-15px_rgba(6,182,212,0.5)]' : 'border-slate-800'} bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col`}
          >
            {plan.popular && (
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
            )}
            
            <div className="p-8 flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                {plan.icon}
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 font-medium">{plan.period}</span>
              </div>
              <p className="text-slate-400 text-sm mb-8 h-10">
                {plan.description}
              </p>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded && plan.notIncluded.map((feature, idx) => (
                  <li key={`not-${idx}`} className="flex items-start gap-3 opacity-50">
                    <Check className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="text-slate-500 text-sm line-through">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 pt-0 mt-auto">
              {currentTier === plan.tier ? (
                <Button 
                  className="w-full bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-default"
                  disabled
                >
                  Current Plan
                </Button>
              ) : (
                <Button 
                  variant={plan.buttonVariant} 
                  className={`w-full ${plan.popular ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0' : ''}`}
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={loading || (currentTier !== "FREE" && plan.tier === "FREE")}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Subscribe'}
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
