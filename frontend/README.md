# WAF Security Operations Center - Frontend

React 18 dashboard with TypeScript and Domain-Driven Design architecture for real-time WAF monitoring and attack testing.

## Architecture

### Domain-Driven Design Structure

```
frontend/src/
├── domain/             # Business logic and entities
│   ├── entities/       # Domain entities
│   ├── services/       # Domain services
│   └── value-objects/  # Value objects
├── application/        # Application layer
│   ├── use-cases/      # Business use cases
│   └── dtos/          # Data transfer objects
├── infrastructure/     # External concerns
│   ├── api/           # API client implementation
│   ├── repositories/  # Data access implementations
│   └── storage/       # Local storage utilities
├── presentation/       # UI layer
│   ├── components/    # Reusable UI components
│   ├── pages/        # Page components
│   ├── layouts/      # Layout components
│   └── hooks/        # Custom React hooks
├── context/           # React context providers
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

## Tech Stack

- **React**: 18.2.0 with TypeScript
- **Build Tool**: Vite 5.0.3 with hot reload
- **Styling**: TailwindCSS 3.3.6 with custom design system
- **Charts**: Chart.js 4.5.0 with React wrapper
- **Routing**: React Router 6.20.0 with protected routes
- **State Management**: React Context API
- **Icons**: Lucide React 0.460.0
- **Theme**: next-themes 0.4.6 for dark mode support

## Core Features

### Real-time Dashboard
- Live security event monitoring with WebSocket
- Interactive charts and statistics
- Threat level indicators with visual feedback
- Attack pattern analysis with drill-down capabilities

### Attack Testing Lab
- 10+ comprehensive attack vectors
- Real-time WAF bypass testing
- Payload library with encoding variations
- Test result history and comparison

### Security Event Management
- Advanced filtering and search
- Event details with raw audit logs
- CSV export for reporting
- IP reputation tracking

## Key Components

### Pages

#### DashboardPage
Main monitoring interface with real-time statistics.

**Features:**
- Live metrics with WebSocket updates
- Interactive charts (Line, Doughnut)
- Recent events timeline
- Top source IPs analysis
- Attack type distribution

#### SecurityEventsPage
Detailed security event management and analysis.

**Features:**
- Advanced filtering (time, IP, attack type, severity)
- Pagination with server-side sorting
- Event details modal with raw logs
- Bulk operations and CSV export

#### AttackLabPage
Comprehensive attack testing laboratory.

**Features:**
- 10+ attack vectors with multiple payloads
- Real-time WAF testing with visual feedback
- Test history and comparison
- Custom payload input with file upload
- Auto-testing capabilities

#### AnalyticsPage
Advanced analytics and reporting dashboard.

**Features:**
- Time-based trend analysis
- Period comparison charts
- Drill-down capabilities
- Custom date range selection

### Context Providers

#### AuthContext
User authentication and session management.

**Features:**
- JWT token management with localStorage persistence
- Automatic token refresh and validation
- Protected route handling
- User profile management

#### ThemeContext
Dark/light theme management with system preference detection.

## API Integration

### ApiClient
Type-safe API client with automatic error handling.

```typescript
class ApiClient {
  private baseUrl: string = '/api';
  private token: string | null = null;

  // Authentication methods
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthToken>>
  async getCurrentUser(): Promise<ApiResponse<User>>

  // Security event methods
  async getSecurityEvents(params: EventFilters): Promise<ApiResponse<PaginatedEvents>>
  async getEventDetails(id: string): Promise<ApiResponse<SecurityEvent>>

  // Attack testing methods
  async testXSS(payload: string): Promise<ApiResponse<TestResult>>
  async testSQLInjection(payload: string): Promise<ApiResponse<TestResult>>
}
```

### WebSocket Integration
Real-time event streaming with automatic reconnection.

```typescript
const useWebSocket = (url: string) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'critical_event') {
        setEvents(prev => [data.data, ...prev]);
      }
    };
    
    return () => ws.close();
  }, [url]);
  
  return events;
};
```

## Design System

### Apple-inspired Color Palette
```css
:root {
  --primary: #0071E3;      /* Apple Blue */
  --success: #30D158;      /* Apple Green */
  --warning: #FFD60A;      /* Apple Yellow */
  --danger: #FF453A;       /* Apple Red */
  --info: #0A84FF;         /* Apple Light Blue */
}
```

### Typography Scale
- SF Pro Display font family (Apple system font)
- Responsive font sizes (xs: 11px → 5xl: 56px)
- Line heights optimized for readability

### Component System
- **Cards**: Consistent spacing and shadows
- **Buttons**: Primary, secondary, and ghost variants
- **Forms**: Consistent input styling with validation states
- **Charts**: Consistent color scheme and interaction patterns

## State Management

### Context Pattern
Uses React Context for global state management:

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const AuthContext = createContext<{
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<{success: boolean; error?: string}>;
  logout: () => void;
} | null>(null);
```

### Local Storage Persistence
- JWT tokens persisted across sessions
- User preferences (theme, language)
- Dashboard layout preferences

## Routing

### Protected Routes
```typescript
const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<MainLayout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="security-events" element={<SecurityEventsPage />} />
        <Route path="attack-lab" element={<AttackLabPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Route>
  </Routes>
);
```

### Route Guards
- Authentication check with token validation
- Role-based access control
- Automatic redirects for unauthenticated users

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev          # Starts on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Bundle analysis
npm run analyze
```

### Development Server Configuration
- **Host**: 0.0.0.0 (accessible from Docker)
- **Port**: 3000 (production) / 5173 (development)
- **Proxy**: `/api` requests proxied to backend
- **Hot Reload**: Enabled for TypeScript and CSS

### Build Configuration
- **Output**: `dist/` directory
- **Optimization**: Tree shaking, minification, code splitting
- **Assets**: Static assets with hashing for cache busting
- **Bundle Analysis**: Visualization of bundle size and dependencies

## TypeScript Configuration

### Strict Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Path Mapping
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@components/*": ["./src/components/*"],
    "@pages/*": ["./src/pages/*"],
    "@utils/*": ["./src/utils/*"],
    "@context/*": ["./src/context/*"]
  }
}
```

## Type Definitions

### Core Types
```typescript
interface SecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  attack_type: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_blocked: boolean;
  is_attack: boolean;
  anomaly_score: number;
  risk_score: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  created_at: string;
}

interface AttackTest {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  endpoint: string;
  method: 'GET' | 'POST';
  payloads: AttackPayload[];
}
```

## Performance Optimization

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Dynamic imports for large dependencies

### Caching Strategy
- API response caching with TTL
- Static asset caching with service worker
- LocalStorage for user preferences

### Bundle Optimization
- Tree shaking for unused code elimination
- Minification and compression
- Asset optimization (images, fonts)

## Error Handling

### Error Boundaries
```typescript
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### API Error Handling
- Automatic retry for network errors
- User-friendly error messages
- Fallback UI for failed requests

## Testing

### Component Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm run test

# Test coverage
npm run test:coverage
```

### Testing Utilities
- React Testing Library for component testing
- Mock Service Worker for API mocking
- Custom render utilities with providers

## Accessibility

### WCAG 2.1 Compliance
- Semantic HTML elements
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility

### Color Contrast
- AA compliant color combinations
- High contrast mode support
- Color-blind friendly palette

## Security

### Content Security Policy
- Strict CSP headers
- Inline script restrictions
- Trusted source domains

### Input Sanitization
- DOMPurify for HTML sanitization
- XSS prevention measures
- Safe rendering practices

## Deployment

### Production Build
```bash
# Build optimized production bundle
npm run build

# Serve with static file server
npx serve -s dist -l 3000
```

### Docker Deployment
- Multi-stage build for size optimization
- Static file serving with nginx
- Health check endpoints

### Environment Configuration
```bash
# Environment variables
VITE_API_BASE_URL=/api
VITE_APP_TITLE="WAF Security Operations Center"
VITE_WS_URL=ws://localhost/api/ws
```