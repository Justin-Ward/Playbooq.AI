import Navbar from '@/components/Navbar'
import { BookOpen, Store } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const tickerItems = [
    "Build an app using AI",
    "Build and maintain a garden", 
    "Create an efficient company treasury department",
    "Develop effective networking strategies",
    "Launch a successful podcast",
    "Master digital marketing fundamentals",
    "Build a productive morning routine",
    "Create an onboarding process for new employees",
    "Plan the perfect wedding on a budget",
    "Start a successful e-commerce store",
    "Become a better public speaker",
    "Organize a cross-country move"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              Discover and build a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                winning playbook
              </span>
              {' '}for anything and put it to action with your team (or solo)
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-4xl mx-auto">
              Create AI-powered step-by-step guides, discover proven strategies from experts, 
              and execute with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Main Action Cards */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Build Playbooks Card */}
            <Link href="/coming-soon" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 h-full">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-100 rounded-full p-4 mr-4 group-hover:bg-blue-200 transition-colors duration-300">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Build my playbooks</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Create AI-powered playbooks from scratch or your own documents. 
                  Transform your knowledge into actionable, step-by-step guides that 
                  drive consistent results.
                </p>
                <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors duration-300">
                  <span>Get started</span>
                  <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
        </div>
      </div>
            </Link>

            {/* Marketplace Card */}
            <Link href="/coming-soon" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 h-full">
                <div className="flex items-center mb-6">
                  <div className="bg-purple-100 rounded-full p-4 mr-4 group-hover:bg-purple-200 transition-colors duration-300">
                    <Store className="h-8 w-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Marketplace: Browse winning playbooks</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Discover and purchase proven playbooks from experts across industries. 
                  Skip the trial and error – leverage battle-tested strategies that work.
                </p>
                <div className="mt-6 flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors duration-300">
                  <span>Explore marketplace</span>
                  <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
      </div>
      </section>

      {/* Scrolling Ticker Tape */}
      <section className="pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <h3 className="text-center text-2xl font-bold text-gray-900 mb-4">
            Popular Playbook Ideas
          </h3>
          <p className="text-center text-gray-600 mb-8">
            Get inspired by what others are building
          </p>
        </div>
        
        <div className="relative">
          <div className="flex animate-scroll">
            {/* First set of items */}
            {tickerItems.map((item, index) => (
              <div
                key={`first-${index}`}
                className="flex-shrink-0 mx-4 bg-white rounded-full px-6 py-3 shadow-md border border-gray-100"
              >
                <span className="text-gray-700 font-medium whitespace-nowrap">
                  {item}
            </span>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {tickerItems.map((item, index) => (
              <div
                key={`second-${index}`}
                className="flex-shrink-0 mx-4 bg-white rounded-full px-6 py-3 shadow-md border border-gray-100"
              >
                <span className="text-gray-700 font-medium whitespace-nowrap">
                  {item}
            </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to build your first playbook?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who are scaling their success with proven playbooks.
          </p>
          <Link 
            href="/coming-soon"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-full hover:bg-gray-50 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Start Building
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
      </div>
  )
}