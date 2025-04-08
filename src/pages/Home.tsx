import React from 'react';
import { Helmet } from 'react-helmet';
import { CreditCard, Zap } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      <Helmet>
        <title>GenBI - Generative Business Intelligence</title>
        <meta name="description" content="Transform your data into actionable insights with our AI-powered business intelligence platform. Ask questions in plain English and get visualization instantly." />
      </Helmet>
      
      {/* Hero Section */}
      <div className="relative pt-16 pb-32 bg-gray-900 sm:pt-24 lg:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-0">
              <img
                className="h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80&blend=777853&blend-mode=multiply"
                alt=""
              />
            </div>
            <div className="absolute inset-0 bg-purple-900 mix-blend-multiply" aria-hidden="true" />
            <div className="relative py-16 px-6 sm:py-24 lg:py-32">
              <h1 className="text-center text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Unlock Your Data's Potential with AI
              </h1>
              <p className="mt-6 max-w-xl mx-auto text-center text-xl text-purple-200">
                Transform raw data into actionable insights. Ask questions in plain English and get instant visualizations.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/pay-now" className="btn-cta bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscribe Now
                </a>
                <a href="/signup" className="btn-cta purple-gradient text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center">
                  <Zap className="mr-2 h-4 w-4" />
                  Start Free Trial
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base font-semibold tracking-wide text-purple-400 uppercase">Features</h2>
            <p className="mt-2 text-3xl font-bold leading-8 tracking-tight text-white sm:text-4xl">
              Why Choose GenBI?
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-300 lg:mx-auto">
              From data upload to insightful visualizations, GenBI simplifies the entire business intelligence process.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 md:space-y-0">
              <div className="relative">
                <dt>
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-purple-500 text-white">
                    {/* Heroicon name: outline/globe-americas */}
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5.5a2.5 2.5 0 012.5 2.5V19a2.5 2.5 0 01-2.5 2.5H3.055a2.5 2.5 0 01-2.5-2.5V13.5a2.5 2.5 0 012.5-2.5zM8.555 11H11a2.5 2.5 0 012.5 2.5V19a2.5 2.5 0 01-2.5 2.5H8.555a2.5 2.5 0 01-2.5-2.5V13.5a2.5 2.5 0 012.5-2.5zM14.055 11H16.5a2.5 2.5 0 012.5 2.5V19a2.5 2.5 0 01-2.5 2.5H14.055a2.5 2.5 0 01-2.5-2.5V13.5a2.5 2.5 0 012.5-2.5z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg font-medium leading-6 text-white">AI-Powered Analysis</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-300">
                  Get instant insights with AI that understands your data and answers your questions in plain English.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-purple-500 text-white">
                    {/* Heroicon name: outline/scale */}
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.002 0M6 7l3 9M12 6l3 1m0 0l-3 9a5.002 5.002 0 006.002 0M15 7l3 9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg font-medium leading-6 text-white">Data Visualization</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-300">
                  Visualize your data with a variety of charts and graphs, making it easy to identify trends and patterns.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-purple-500 text-white">
                    {/* Heroicon name: outline/lightning-bolt */}
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg font-medium leading-6 text-white">Easy Data Upload</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-300">
                  Upload your data in various formats and let GenBI handle the rest. No coding required.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-purple-500 text-white">
                    {/* Heroicon name: outline/annotation */}
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m14-1a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg font-medium leading-6 text-white">Customizable Dashboards</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-300">
                  Create personalized dashboards to monitor key metrics and track performance.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base font-semibold tracking-wide text-purple-400 uppercase">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold leading-8 tracking-tight text-white sm:text-4xl">
              What Our Users Say
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-300 lg:mx-auto">
              See how GenBI has helped businesses like yours unlock the power of their data.
            </p>
          </div>

          <div className="mt-10">
            <ul className="space-y-10 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 sm:space-y-0">
              <li className="py-4 px-6 bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1494790108377-be9c29b2933e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60" alt="" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-medium leading-6 text-white">Sarah Johnson</p>
                    <p className="text-sm text-gray-400">Marketing Manager</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-base text-gray-300">
                    "GenBI has revolutionized the way we analyze our marketing data. The AI-powered insights are incredibly valuable."
                  </p>
                </div>
              </li>

              <li className="py-4 px-6 bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <img className="h-10 w-10 rounded-full" src="https://images.unsplash.com/photo-1500648767791-00d5a4ee9baa?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60" alt="" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-medium leading-6 text-white">Michael Brown</p>
                    <p className="text-sm text-gray-400">CEO</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-base text-gray-300">
                    "As a CEO, I need quick access to key performance indicators. GenBI's customizable dashboards provide exactly that."
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-gray-800 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Get Started?
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <a
                href="/pay-now"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-500 px-5 py-3 text-base font-medium text-white hover:bg-purple-600"
              >
                Subscribe Now
              </a>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
