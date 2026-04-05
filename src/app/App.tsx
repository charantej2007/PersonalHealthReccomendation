import { RouterProvider } from 'react-router';
import { router } from './routes';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-[390px] h-[100dvh] sm:h-[800px] bg-white sm:shadow-2xl overflow-hidden sm:rounded-2xl">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}

export default App;
