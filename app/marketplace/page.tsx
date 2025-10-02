import Navbar from '@/components/Navbar';

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Playbook Marketplace
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Discover and explore AI-powered playbooks created by the community.
          </p>
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              The marketplace is currently under development. 
              Soon you'll be able to browse, purchase, and download playbooks from creators worldwide!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
