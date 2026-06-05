import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function NotFound() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md mx-4"
      >
        <Card variant="glass" className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <div className="text-8xl font-black bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent mb-2">
              404
            </div>
            <p className="text-lg text-slate-400 mb-8">
              This page doesn't exist
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="space-y-4"
          >
            <Button
              onClick={() => navigate("/")}
              className="w-full gap-2"
            >
              <Home size={16} />
              Go to Dashboard
            </Button>

            <form onSubmit={handleSearch} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                type="text"
                placeholder="Search across pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              />
            </form>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
