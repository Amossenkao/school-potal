'use client';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import useAuth from '@/store/useAuth';
import { Edit } from 'lucide-react';

export default function UserDropdown() {
	const [isOpen, setIsOpen] = useState(false);
	const isLoading = false;

	const user = {
		firstName: 'Amos',
		lastName: 'Senkao',
		role: 'system_admin',
	};

	function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	}

	function closeDropdown() {
		setIsOpen(false);
	}

	const Skeleton = () => (
		<div className="animate-pulse flex items-center space-x-3">
			<div className="h-11 w-11 rounded-full bg-gray-300 dark:bg-gray-700"></div>
			<div className="flex flex-col space-y-1">
				<div className="w-24 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
				<div className="w-32 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
			</div>
		</div>
	);

	return (
		<div className="relative">
			<button
				onClick={toggleDropdown}
				className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
			>
				<span className="mr-3 overflow-hidden rounded-full h-11 w-11">
					{isLoading ? (
						<div className="h-full w-full bg-gray-300 dark:bg-gray-700 animate-pulse rounded-full" />
					) : (
						<Image
							width={45}
							height={45}
							src={user?.profilePhoto || '/avatars/man3.png'}
							alt="User"
							className="object-cover h-full w-full rounded-full"
						/>
					)}
					\
				</span>

				<span className="block mr-1 font-medium text-theme-sm">
					{isLoading ? (
						<span className="w-20 h-4 bg-gray-300 dark:bg-gray-700 animate-pulse rounded" />
					) : (
						user?.firstName || 'User'
					)}
				</span>

				<svg
					className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
						isOpen ? 'rotate-180' : ''
					}`}
					width="18"
					height="20"
					viewBox="0 0 18 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			<Dropdown
				isOpen={isOpen}
				onClose={closeDropdown}
				className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
			>
				{isLoading ? (
					<Skeleton />
				) : (
					<div>
						<span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
							{`${user?.firstName} ${user?.middleName || ''} ${user?.lastName}`}
						</span>
						<span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
							{user?.email || user?.phone}
						</span>
					</div>
				)}
				<ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
					<li>
						<DropdownItem
							onItemClick={closeDropdown}
							tag="a"
							href="/profile"
							disabled={isLoading}
							className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
						>
							<Edit />
							Edit profile
						</DropdownItem>
					</li>
				</ul>

				<Link
					href="/signin"
					className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
				>
					{/* ...SVG icon... */}
					Sign out
				</Link>
			</Dropdown>
		</div>
	);
}
