import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

type BackButtonProps = {
  className?: string;
  iconClassName?: string;
};

export function BackButton({ className = '', iconClassName = '' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors ${className}`.trim()}
      aria-label="Go back"
    >
      <ArrowLeft className={`w-6 h-6 text-gray-700 ${iconClassName}`.trim()} />
    </button>
  );
}