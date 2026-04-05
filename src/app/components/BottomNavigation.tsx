import { Home, Activity, FileText, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/track', icon: Activity, label: 'Track' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors relative"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                isActive ? 'bg-[#4DB8AC]/10' : ''
              }`}>
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#4DB8AC]' : 'text-gray-400'
                  }`}
                />
              </div>
              <span
                className={`text-xs mt-0.5 ${
                  isActive ? 'text-[#4DB8AC] font-semibold' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#4DB8AC] rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}