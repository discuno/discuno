import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-green-50 via-green-100 to-white px-4">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm text-gray-500">Updating your profile...</p>
      </div>
    </div>
  );
}
