import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* School Info */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block">
              <Image 
                src="/images/SchoolLogo.jpg" 
                alt="School Logo"
                width={150}
                height={40}
                className="dark:hidden"
              />
              <Image 
                src="/images/SchoolLogo.jpg" 
                alt="School Logo"
                width={150}
                height={40}
                className="hidden dark:block"
              />
            </Link>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
              Excellence in education since 1990. Providing quality education to students from all backgrounds.
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/admissions" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Admissions
                </Link>
              </li>
              <li>
                <Link href="/fees-payments" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Fees Payments
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Login
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Programs */}
          <div className="col-span-1">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Programs</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Elementary School
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Middle School
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  High School
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 text-sm">
                  Special Programs
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="col-span-1">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-brand-500 mr-2 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400 text-sm">123 School Street, City, State 12345</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-brand-500 mr-2 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400 text-sm">+1 (123) 456-7890</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-brand-500 mr-2 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400 text-sm">contact@schoolname.edu</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {currentYear} School Name. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}