import React from "react";
import { cn } from "@/lib/utils";
import UserAuth from "./auth/UserAuth";

interface Props {
  className?: string;
}

const Header: React.FC<Props> = (props) => {
  return (
    <div
      className={cn("px-4 py-2 w-full flex justify-between", props.className)}
    >
      {/* logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-800">Keep It Short</span>
      </div>

      {/* Login button */}
      <UserAuth className="text-sm text-gray-600" />
    </div>
  );
};

export default Header;
