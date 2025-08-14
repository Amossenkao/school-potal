import swaggerJSDoc from 'swagger-jsdoc';

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'User Management API',
			version: '1.0.0',
			description: 'API documentation for user management system',
		},
		servers: [
			{
				url:
					process.env.NODE_ENV === 'production'
						? 'https://your-domain.com'
						: 'http://localhost:3000',
				description:
					process.env.NODE_ENV === 'production'
						? 'Production server'
						: 'Development server',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				User: {
					type: 'object',
					properties: {
						userId: {
							type: 'string',
							description: 'Unique user identifier',
						},
						username: {
							type: 'string',
							description: 'Username',
						},
						email: {
							type: 'string',
							format: 'email',
							description: 'Email address',
						},
						firstName: {
							type: 'string',
							description: 'First name',
						},
						lastName: {
							type: 'string',
							description: 'Last name',
						},
						role: {
							type: 'string',
							enum: ['user', 'admin', 'system_admin'],
							description: 'User role',
						},
						bio: {
							type: 'string',
							description: 'User biography',
						},
						phone: {
							type: 'string',
							description: 'Phone number',
						},
						createdAt: {
							type: 'string',
							format: 'date-time',
							description: 'Creation timestamp',
						},
						updatedAt: {
							type: 'string',
							format: 'date-time',
							description: 'Last update timestamp',
						},
					},
				},
				UpdateUserRequest: {
					type: 'object',
					properties: {
						bio: {
							type: 'string',
							description: 'User biography',
						},
						phone: {
							type: 'string',
							description: 'Phone number',
						},
						email: {
							type: 'string',
							format: 'email',
							description: 'Email address',
						},
						password: {
							type: 'string',
							description: 'New password',
							minLength: 6,
						},
					},
				},
				ApiResponse: {
					type: 'object',
					properties: {
						success: {
							type: 'boolean',
							description: 'Request success status',
						},
						message: {
							type: 'string',
							description: 'Response message',
						},
						data: {
							type: 'object',
							description: 'Response data',
						},
						errors: {
							type: 'array',
							items: {
								type: 'string',
							},
							description: 'Validation errors',
						},
					},
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	apis: [
		'./app/api/**/*.ts', // App Router
		'./pages/api/**/*.ts', // Pages Router (if using)
	],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
