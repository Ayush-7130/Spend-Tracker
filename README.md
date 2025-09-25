# Spend Tracker Web Application

A full-featured expense tracking application built with Next.js 14, MongoDB Atlas, and Bootstrap 5.

## Features

### ✅ Implemented Features

- **Dashboard**: Overview with quick stats, recent expenses, and quick actions
- **Expense Management**:
  - Add expenses with split logic (equal/custom)
  - View expenses with filtering, searching, and pagination
  - Bulk delete operations
  - Category and subcategory assignment
- **Category Management**: Full CRUD operations for expense categories
- **Analytics Dashboard**:
  - Settlement tracking between users
  - Expense breakdown by category (pie chart)
  - Spending trends over time (line chart)
  - Person-wise spending comparison (bar chart)
  - Time-based analysis (monthly/quarterly/yearly)
- **Responsive Design**: Mobile-first Bootstrap 5 implementation
- **User Management**: Switch between Saket and Ayush

## Technology Stack

- **Frontend & Backend**: Next.js 14 (App Router)
- **Database**: MongoDB Atlas
- **Styling**: Bootstrap 5 + Custom CSS
- **Icons**: Bootstrap Icons
- **Charts**: Chart.js with react-chartjs-2
- **Language**: TypeScript

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account and cluster
- Git

### 2. Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd spend-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy `.env.local.example` to `.env.local` (if exists)
   - Update `.env.local` with your MongoDB Atlas connection string:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@spend-tracker-cluster.oifpzci.mongodb.net/spend-tracker?retryWrites=true&w=majority&appName=spend-tracker-cluster"
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser and navigate to**:
   ```
   http://localhost:3000
   ```

## Database Schema

### Collections

1. **users**
   - `_id`: "saket" | "ayush" (String)
   - `name`: String
   - `email`: String
   - `createdAt`: Date

2. **categories**
   - `_id`: String (kebab-case)
   - `name`: String
   - `description`: String
   - `subcategories`: Array of {name, description}
   - `createdAt`: Date

3. **expenses**
   - `_id`: ObjectId
   - `amount`: Number
   - `description`: String
   - `date`: Date
   - `category`: String (references categories._id)
   - `subcategory`: String
   - `paidBy`: "saket" | "ayush"
   - `isSplit`: Boolean
   - `splitDetails`: {type, saketAmount, ayushAmount}
   - `createdAt`: Date
   - `updatedAt`: Date

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Expenses
- `GET /api/expenses` - Get expenses with filtering and pagination
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Analytics
- `GET /api/analytics/summary` - Get overview statistics
- `GET /api/analytics/categories` - Get category-wise analytics
- `GET /api/analytics/trends` - Get time-based trends

## Pages

1. **Dashboard** (`/`) - Overview with stats and recent expenses
2. **Add Expense** (`/expenses/add`) - Form to add new expenses
3. **Expenses List** (`/expenses`) - Table view with filters and search
4. **Categories** (`/categories`) - Manage expense categories
5. **Analytics** (`/analytics`) - Charts and insights

## Key Features Highlights

### Split Logic
- **Equal Split**: Automatically divides amount equally
- **Custom Split**: Manual entry with validation
- **Settlement Tracking**: Shows who owes whom

### Responsive Design
- Mobile-first approach using Bootstrap 5
- Collapsible navigation for mobile devices
- Responsive tables and cards
- Touch-friendly interface

### Data Visualization
- **Pie Chart**: Expense breakdown by category
- **Line Chart**: Spending trends over time
- **Bar Chart**: Person-wise spending comparison
- **Interactive**: Hover effects and detailed tooltips

### User Experience
- **Form Validation**: Client and server-side validation
- **Loading States**: Spinners and feedback
- **Error Handling**: User-friendly error messages
- **Success Notifications**: Confirmation messages
- **Pagination**: Efficient data loading

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analytics/
│   │   ├── categories/
│   │   └── expenses/
│   ├── analytics/
│   ├── categories/
│   ├── expenses/
│   │   └── add/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── MainLayout.tsx
│   └── Navigation.tsx
└── lib/
    └── mongodb.ts
```

## Development Notes

### TypeScript
- Strict type checking enabled
- Proper interface definitions for all data structures
- Type safety for API responses

### Performance Optimizations
- MongoDB aggregation pipelines for analytics
- Efficient pagination
- Client-side data caching
- Debounced search functionality

### Security
- Input validation and sanitization
- MongoDB injection prevention
- Environment variable protection

## Sample Data

The application expects pre-seeded data:
- 2 users (Saket, Ayush)
- 6 categories with subcategories
- 150+ sample expenses

## Troubleshooting

1. **MongoDB Connection Issues**:
   - Verify the connection string in `.env.local`
   - Check if your IP is whitelisted in MongoDB Atlas
   - Ensure the database name is correct

2. **Build Errors**:
   - Run `npm run build` to check for build issues
   - Check for TypeScript errors

3. **Chart Display Issues**:
   - Ensure chart.js and react-chartjs-2 are properly installed
   - Check browser console for JavaScript errors

## Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel** (recommended):
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Environment Variables**:
   - Add `MONGODB_URI` to your deployment platform's environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes.
