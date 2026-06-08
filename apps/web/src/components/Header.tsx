import React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAuth from "./auth/UserAuth";

interface Props {
  className?: string;
}

const Header: React.FC<Props> = (props) => {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-gray-200/60 dark:border-gray-800/60",
        "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl",
        props.className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Link2 className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Keep It Short
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>
          <UserAuth className="text-sm" />
        </div>
      </div>
    </header>
  );
};

export default Header;
