"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-white shadow-md dark:bg-gray-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Image 
                className="block h-8 w-auto dark:hidden" 
                src="/images/SchoolLogo.jpg" 
                alt="School Logo"
                width={150}
                height={40}
              />
              <Image 
                className="hidden h-8 w-auto dark:block" 
                src="/images/SchoolLogo.jpg" 
                alt="School Logo"
                width={150}
                height={40}
              />
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link 
              href="/" 
              className="text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 px-3 py-2 text-sm font-medium"
            >
              Home
            </Link>
            <Link 
              href="/admissions" 
              className="text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 px-3 py-2 text-sm font-medium"
            >
              Admissions
            </Link>
            <Link 
              href="/fees-payments" 
              className="text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 px-3 py-2 text-sm font-medium"
            >
              Fees Payments
            </Link>
            <Link 
              href="/about" 
              className="text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 px-3 py-2 text-sm font-medium"
            >
              About
            </Link>
            <Link 
              href="/login" 
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Login
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            href="/" 
            className="block text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link 
            href="/admissions" 
            className="block text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            Admissions
          </Link>
          <Link 
            href="/fees-payments" 
            className="block text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            Fees Payments
          </Link>
          <Link 
            href="/about" 
            className="block text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link 
            href="/login" 
            className="block bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsOpen(false)}
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}