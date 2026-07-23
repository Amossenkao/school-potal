

export default function Inactive() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Account Inactive</h1>
      <p className="text-lg text-gray-600 mb-6">
        Your account is currently inactive. Please contact support for assistance.
      </p>
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Contact Support
      </button>
    </div>
  );
}