import React from "react";
import { 
  BarChart3, 
  Sun, 
  Moon, 
  RotateCw, 
  Database
} from "lucide-react";

interface NavbarProps {
  isDark: boolean;
  toggleTheme: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  selectedRegion: string;
  onRegionChange: (r: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  totalTransactions: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDark,
  toggleTheme,
  onRefresh,
  isLoading,
  selectedRegion,
  onRegionChange,
  selectedCategory,
  onCategoryChange,
  totalTransactions,
}) => {
  const regions = ["All", "North", "South", "West", "East", "Central"];
  const categories = [
    "All",
    "Ethnic & Modern Apparel",
    "Electronics & Gadgets",
    "Home & Kitchen",
    "Personal Care & Ayurveda",
    "Sports & Fitness",
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0c0c0f]/80 backdrop-blur-md transition-colors">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-emerald-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                BharatRetail Analytics
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
                🇮🇳 India Star Schema
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pan-India Enterprise Performance & Festive Demand Intelligence
            </p>
          </div>
        </div>

        {/* Global Filters & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Data health badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>{(totalTransactions || 150000).toLocaleString("en-IN")} Txns</span>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-1.5">
            <label className="hidden md:inline text-xs font-medium text-zinc-500">Region:</label>
            <select
              value={selectedRegion}
              onChange={(e) => onRegionChange(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-orange-500/40 focus:outline-none transition-all cursor-pointer"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All India" : `${r} Region`}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <label className="hidden md:inline text-xs font-medium text-zinc-500">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-orange-500/40 focus:outline-none transition-all cursor-pointer max-w-[160px] truncate"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh action */}
          <button
            onClick={onRefresh}
            title="Refresh analytical engine"
            disabled={isLoading}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-orange-500" : ""}`} />
          </button>

          {/* Theme switch */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
