# Reglas para Desarrollo con React + TypeScript
## Guía para Agentes de IA y Desarrolladores

---

## ✅ TL;DR (Reglas obligatorias)

- **TypeScript estricto**
  - `strict: true`
  - **Prohibido** `any` (usar `unknown` + type guards)
- **Componentes con una responsabilidad**
  - Si un componente supera **150 líneas**, dividir
- **Servicios fuera del componente**
  - Llamadas a API en `services/` o hooks
- **Estado sin duplicación**
  - No guardar estado derivado; calcularlo con `useMemo`/funciones
- **Manejo de errores consistente**
  - `try/catch` en async + feedback visible al usuario
- **Accesibilidad mínima**
  - `label`/roles/teclado para elementos interactivos

## ✅ Checklist antes de commit

- **0 usos de `any`**
- **Props y estados tipados** (en casos no triviales)
- **Componentes < 150 líneas** o justificación
- **Sin estado derivado duplicado**
- **Errores manejados** (try/catch + UI)
- **Imports ordenados**
- **Nombres descriptivos**
- **DRY** (sin lógica copiada)

---

## 🎯 PRINCIPIOS FUNDAMENTALES

**Estas reglas DEBEN seguirse SIEMPRE al generar código React + TypeScript.**

---

## 1. ESTRUCTURA Y ORGANIZACIÓN

### Regla 1.1: Estructura de Carpetas
```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes de UI básicos (Button, Input, etc.)
│   ├── forms/          # Componentes de formularios
│   └── layout/         # Componentes de layout (Header, Sidebar, etc.)
├── features/           # Features agrupadas por dominio
│   └── auth/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── hooks/              # Custom hooks compartidos
├── services/           # Servicios y llamadas a API
├── types/              # Tipos TypeScript compartidos
├── utils/              # Funciones utilitarias
├── constants/          # Constantes de la aplicación
└── store/              # Estado global (si se usa)
```

### Regla 1.2: Nomenclatura de Archivos
```typescript
// ✅ CORRECTO
components/UserProfile.tsx          // Componentes: PascalCase
hooks/useAuth.ts                   // Hooks: camelCase con prefijo 'use'
services/userService.ts            // Servicios: camelCase con sufijo 'Service'
types/user.types.ts                // Tipos: camelCase con sufijo '.types'
utils/formatDate.ts                // Utils: camelCase descriptivo
constants/apiEndpoints.ts          // Constants: camelCase

// ❌ INCORRECTO
components/user-profile.tsx
hooks/auth.ts
services/user.ts
```

---

## 2. COMPONENTES REACT

### Regla 2.1: Usar Functional Components con TypeScript
```typescript
// ✅ CORRECTO: Componente funcional con tipos explícitos
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
  };
  onEdit?: (userId: string) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  onEdit, 
  className = '' 
}) => {
  return (
    <div className={`user-card ${className}`}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={() => onEdit(user.id)}>Edit</button>
      )}
    </div>
  );
};

// ❌ INCORRECTO: Sin tipos, props ambiguas
export const UserCard = ({ user, onEdit, className }) => {
  // ...
};
```

### Regla 2.2: Un Componente, Una Responsabilidad
```typescript
// ❌ INCORRECTO: Componente hace demasiado
const UserDashboard = () => {
  // Maneja autenticación
  // Fetch de datos
  // Lógica de formularios
  // Renderiza todo el dashboard
  // 300+ líneas
};

// ✅ CORRECTO: Componentes separados y enfocados
const UserDashboard = () => {
  return (
    <div>
      <DashboardHeader />
      <UserStats />
      <RecentActivity />
      <UserActions />
    </div>
  );
};

const DashboardHeader: React.FC = () => { /* ... */ };
const UserStats: React.FC<{ stats: Stats }> = ({ stats }) => { /* ... */ };
```

### Regla 2.3: Componentes Máximo 150 Líneas
- Si un componente supera 150 líneas, divídelo
- Extrae lógica compleja a custom hooks
- Extrae JSX repetitivo a subcomponentes

### Regla 2.4: Props Destructuring con Valores por Defecto
```typescript
// ✅ CORRECTO
interface ButtonProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  text,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}) => {
  // ...
};

// ❌ INCORRECTO: Props sin destructurar
export const Button: React.FC<ButtonProps> = (props) => {
  return <button>{props.text}</button>;
};
```

### Regla 2.5: Exportar Solo lo Necesario
```typescript
// ✅ CORRECTO
// UserProfile.tsx
const UserAvatar: React.FC = () => { /* ... */ };  // No exportado (interno)

export const UserProfile: React.FC<Props> = () => {
  return (
    <div>
      <UserAvatar />
      {/* ... */}
    </div>
  );
};

// ❌ INCORRECTO: Exportar componentes internos sin necesidad
export const UserAvatar: React.FC = () => { /* ... */ };
export const UserProfile: React.FC = () => { /* ... */ };
```

---

## 3. TYPESCRIPT: TIPADO ESTRICTO

### Regla 3.1: NUNCA Usar `any`
```typescript
// ❌ PROHIBIDO
const handleData = (data: any) => {
  // ...
};

// ✅ CORRECTO: Tipos específicos
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const handleData = (data: ApiResponse<User>) => {
  // TypeScript ahora puede ayudarte con autocompletado
};

// ✅ Si realmente no conoces el tipo, usa unknown
const handleUnknownData = (data: unknown) => {
  if (isUser(data)) {
    // Type guard
    // Ahora data es User
  }
};
```

### Regla 3.2: Definir Interfaces para Props
```typescript
// ✅ CORRECTO
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    currency: 'USD' | 'EUR' | 'MXN';
    inStock: boolean;
    images: string[];
  };
  onAddToCart: (productId: string, quantity: number) => void;
  showDetails?: boolean;
}

// ❌ INCORRECTO: Props sin tipo
const ProductCard = ({ product, onAddToCart, showDetails }) => {
  // ...
};
```

### Regla 3.3: Tipos para Estados
```typescript
// ✅ CORRECTO: Estado con tipo explícito
interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const [userState, setUserState] = useState<UserState>({
  user: null,
  isLoading: false,
  error: null
});

// ✅ Inferencia cuando es obvio
const [count, setCount] = useState(0);  // TypeScript infiere number
const [isOpen, setIsOpen] = useState(false);  // TypeScript infiere boolean

// ❌ INCORRECTO: Estado sin tipo en casos complejos
const [userState, setUserState] = useState({});
```

### Regla 3.4: Tipos Reutilizables en Archivos Separados
```typescript
// types/user.types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserFormData {
  email: string;
  name: string;
  password: string;
}

// Usar en componentes
import { User, UserRole } from '@/types/user.types';
```

### Regla 3.5: Utility Types cuando Apliquen
```typescript
// ✅ CORRECTO: Uso de utility types
interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
}

// Solo campos necesarios para actualización
type UserUpdateData = Partial<Omit<User, 'id' | 'password'>>;

// Solo campos públicos
type PublicUser = Omit<User, 'password'>;

// Solo lectura
type ReadonlyUser = Readonly<User>;
```

---

## 4. HOOKS

### Regla 4.1: Custom Hooks para Lógica Reutilizable
```typescript
// ✅ CORRECTO: Custom hook con lógica reutilizable
// hooks/useAuth.ts
interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  return { user, isLoading, error, login, logout };
};

// Uso en componente
const LoginForm = () => {
  const { login, isLoading, error } = useAuth();
  // ...
};
```

### Regla 4.2: Seguir Reglas de Hooks
```typescript
// ✅ CORRECTO: Hooks al inicio, sin condicionales
const MyComponent = () => {
  const [data, setData] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    // ...
  }, []);

  if (!user) return <Login />;
  
  return <div>{/* ... */}</div>;
};

// ❌ INCORRECTO: Hook dentro de condicional
const MyComponentWrong = () => {
  if (condition) {
    const [data, setData] = useState([]);  // ❌ PROHIBIDO
  }
};
```

### Regla 4.3: useEffect con Dependencias Correctas
```typescript
// ✅ CORRECTO
const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const data = await userService.getUser(userId);
      setUser(data);
    };
    
    fetchUser();
  }, [userId]);  // Dependencia explícita

  return <div>{user?.name}</div>;
};

// ❌ INCORRECTO: Dependencias faltantes
useEffect(() => {
  fetchUser(userId);
}, []);  // ❌ Falta userId en dependencias
```

### Regla 4.4: useMemo y useCallback Solo Cuando Sea Necesario
```typescript
// ✅ CORRECTO: useMemo para cálculos costosos
const ExpensiveComponent = ({ items }: { items: Item[] }) => {
  const sortedItems = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => a.price - b.price)
      .filter(item => item.available);
  }, [items]);

  return <ItemList items={sortedItems} />;
};

// ✅ CORRECTO: useCallback para funciones que se pasan a componentes hijos memoizados
const Parent = () => {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <MemoizedChild onClick={handleClick} />;
};

// ❌ INCORRECTO: Optimización prematura
const Component = () => {
  const value = useMemo(() => 5 + 5, []);  // ❌ Innecesario
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // ❌ Innecesario si no hay memo
};
```

### Regla 4.5: Custom Hooks para Fetch de Datos
```typescript
// ✅ CORRECTO: Hook reutilizable para fetch
interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFetch = <T,>(
  url: string,
  options?: RequestInit
): UseFetchResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('Fetch failed');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, isLoading, error, refetch: fetchData };
};
```

---

## 5. MANEJO DE ESTADO

### Regla 5.1: Estado Local vs Global
```typescript
// ✅ Estado LOCAL: Solo este componente lo necesita
const Modal = () => {
  const [isOpen, setIsOpen] = useState(false);  // ✅ Local
  // ...
};

// ✅ Estado GLOBAL: Múltiples componentes lo necesitan
// store/authStore.ts (usando Zustand como ejemplo)
interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null })
}));
```

### Regla 5.2: No Duplicar Estado
```typescript
// ❌ INCORRECTO: Estado duplicado y derivado
const UserList = ({ users }: { users: User[] }) => {
  const [users, setUsers] = useState(users);
  const [userCount, setUserCount] = useState(users.length);  // ❌ Derivado
  const [hasUsers, setHasUsers] = useState(users.length > 0);  // ❌ Derivado
};

// ✅ CORRECTO: Calcular valores derivados
const UserListOk = ({ users }: { users: User[] }) => {
  const userCount = users.length;
  const hasUsers = users.length > 0;
  
  return (
    <div>
      <p>Total: {userCount}</p>
      {hasUsers && <Users data={users} />}
    </div>
  );
};
```

### Regla 5.3: Actualizar Estado de Forma Inmutable
```typescript
// ✅ CORRECTO: Inmutabilidad
const [todos, setTodos] = useState<Todo[]>([]);

// Agregar
const addTodo = (newTodo: Todo) => {
  setTodos(prev => [...prev, newTodo]);
};

// Actualizar
const updateTodo = (id: string, updates: Partial<Todo>) => {
  setTodos(prev => 
    prev.map(todo => 
      todo.id === id ? { ...todo, ...updates } : todo
    )
  );
};

// Eliminar
const deleteTodo = (id: string) => {
  setTodos(prev => prev.filter(todo => todo.id !== id));
};

// ❌ INCORRECTO: Mutar estado directamente
const addTodoWrong = (newTodo: Todo) => {
  todos.push(newTodo);  // ❌ Mutación directa
  setTodos(todos);
};
```

### Regla 5.4: useReducer para Estado Complejo
```typescript
// ✅ CORRECTO: useReducer para lógica compleja
interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_SUCCESS':
      return { values: {}, errors: {}, isSubmitting: false };
    case 'RESET':
      return { values: {}, errors: {}, isSubmitting: false };
    default:
      return state;
  }
};

const MyForm = () => {
  const [state, dispatch] = useReducer(formReducer, {
    values: {},
    errors: {},
    isSubmitting: false
  });
  
  // ...
};
```

---

## 6. SERVICIOS Y API

### Regla 6.1: Servicios Separados del Componente
```typescript
// ✅ CORRECTO: Servicio separado
// services/userService.ts
import { API_BASE_URL } from '@/constants/config';
import type { User, CreateUserDto } from '@/types/user.types';

class UserService {
  private baseUrl = `${API_BASE_URL}/users`;

  async getAll(): Promise<User[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async getById(id: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  }

  async create(data: CreateUserDto): Promise<User> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete user');
  }
}

export const userService = new UserService();

// Uso en componente
const UsersList = () => {
  const { data, isLoading, error } = useFetch<User[]>('/users');
  // O con custom hook
  const { users } = useUsers();
};
```

### Regla 6.2: Manejo de Errores Consistente
```typescript
// ✅ CORRECTO: Error handling robusto
// utils/apiClient.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network error', 0);
    }
  }
};
```

### Regla 6.3: Tipado de Respuestas API
```typescript
// ✅ CORRECTO: Tipos para respuestas API
// types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Uso
const fetchUsers = async (): Promise<PaginatedResponse<User>> => {
  return apiClient.request<PaginatedResponse<User>>('/users');
};
```

---

## 7. FORMULARIOS

### Regla 7.1: Componentes Controlados
```typescript
// ✅ CORRECTO: Input controlado con tipos
interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validar y enviar
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};
```

### Regla 7.2: Validación de Formularios
```typescript
// ✅ CORRECTO: Validación con tipos
// utils/validation.ts
export interface ValidationError {
  field: string;
  message: string;
}

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
};

// Uso en componente
const LoginFormWithValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
};
```

---

## 8. PERFORMANCE

### Regla 8.1: React.memo para Componentes Pesados
```typescript
// ✅ CORRECTO: Memo para evitar re-renders innecesarios
interface ExpensiveListProps {
  items: Item[];
  onItemClick: (id: string) => void;
}

export const ExpensiveList = React.memo<ExpensiveListProps>(
  ({ items, onItemClick }) => {
    return (
      <ul>
        {items.map(item => (
          <li key={item.id} onClick={() => onItemClick(item.id)}>
            {item.name}
          </li>
        ))}
      </ul>
    );
  },
  // Comparación personalizada opcional
  (prevProps, nextProps) => {
    return prevProps.items === nextProps.items;
  }
);
```

### Regla 8.2: Lazy Loading de Componentes
```typescript
// ✅ CORRECTO: Lazy loading de rutas
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
```

### Regla 8.3: Virtualización para Listas Largas
```typescript
// ✅ CORRECTO: Virtualizar listas con más de 50 items
import { FixedSizeList } from 'react-window';

interface VirtualListProps {
  items: Item[];
}

export const VirtualList: React.FC<VirtualListProps> = ({ items }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### Regla 8.4: Debounce para Inputs de Búsqueda
```typescript
// ✅ CORRECTO: Debounce en búsquedas
// hooks/useDebounce.ts
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

---

## 9. MANEJO DE ERRORES (continuación)

### Regla 9.2: Try-Catch en Funciones Asíncronas (continuación)
```typescript
// ✅ CORRECTO: Manejo de errores async
const fetchUserData = async (userId: string) => {
  try {
    const user = await userService.getById(userId);
    return { success: true, data: user, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch user:', message);
    return { success: false, data: null, error: message };
  }
};

// ❌ INCORRECTO: Sin manejo de errores
const fetchUserDataWrong = async (userId: string) => {
  const user = await userService.getById(userId); // Puede fallar
  return user;
};
```

### Regla 9.3: Mensajes de Error al Usuario
```typescript
// ✅ CORRECTO: UI feedback para errores
const UserProfile = ({ userId }: { userId: string }) => {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await userService.getById(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!user) return <NotFound />;

  return <div>{user.name}</div>;
};
```

## 10. TESTING (Buenas Prácticas)

### Regla 10.1: Nombrar Tests Descriptivamente
```typescript
// ✅ CORRECTO: Tests descriptivos
describe('UserCard', () => {
  it('should render user name and email', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    const user = { id: '1', name: 'John', email: 'john@example.com' };
    
    render(<UserCard user={user} onEdit={mockOnEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    
    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('should not render edit button when onEdit is not provided', () => {
    const user = { id: '1', name: 'John', email: 'john@example.com' };
    render(<UserCard user={user} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});

// ❌ INCORRECTO: Tests poco descriptivos
it('test 1', () => { /* ... */ });
it('works', () => { /* ... */ });
```

### Regla 10.2: Testear Comportamiento, No Implementación
```typescript
// ✅ CORRECTO: Test basado en comportamiento
it('should filter users by search term', () => {
  render(<UserList users={mockUsers} />);
  
  const searchInput = screen.getByPlaceholderText('Search users...');
  fireEvent.change(searchInput, { target: { value: 'john' } });
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
});

// ❌ INCORRECTO: Test basado en implementación
it('should call setFilteredUsers with correct value', () => {
  const setFilteredUsers = jest.fn();
  // Testeando detalles internos
});
```

### Regla 10.3: Mock de Dependencias Externas
```typescript
// ✅ CORRECTO: Mock de servicios
jest.mock('@/services/userService', () => ({
  userService: {
    getById: jest.fn(),
    getAll: jest.fn(),
  }
}));
```

## 11. ACCESIBILIDAD (a11y)

### Regla 11.1: Etiquetas Semánticas HTML
```typescript
// ✅ CORRECTO: HTML semántico
const Article = () => (
  <article>
    <header>
      <h1>Title</h1>
      <time dateTime="2024-01-01">January 1, 2024</time>
    </header>
    <main>
      <p>Content...</p>
    </main>
    <footer>
      <nav>
        <a href="/prev">Previous</a>
        <a href="/next">Next</a>
      </nav>
    </footer>
  </article>
);

// ❌ INCORRECTO: Solo divs
const ArticleWrong = () => (
  <div>
    <div>
      <div>Title</div>
      <div>January 1, 2024</div>
    </div>
    <div>Content...</div>
  </div>
);
```

### Regla 11.2: ARIA Labels y Roles
```typescript
// ✅ CORRECTO: ARIA apropiado
const SearchForm = () => (
  <form role="search" onSubmit={handleSearch}>
    <label htmlFor="search-input">Search</label>
    <input
      id="search-input"
      type="search"
      aria-label="Search users"
      aria-describedby="search-help"
    />
    <span id="search-help" className="sr-only">
      Enter name or email to search
    </span>
    <button type="submit" aria-label="Submit search">
      <SearchIcon aria-hidden="true" />
    </button>
  </form>
);

// ❌ INCORRECTO: Sin ARIA, sin labels
const SearchFormWrong = () => (
  <div>
    <input type="text" placeholder="Search" />
    <button><SearchIcon /></button>
  </div>
);
```

### Regla 11.3: Navegación por Teclado
```typescript
// ✅ CORRECTO: Navegación por teclado
const Dropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Menu
      </button>
      {isOpen && (
        <ul role="menu">
          <li role="menuitem" tabIndex={0}>Option 1</li>
          <li role="menuitem" tabIndex={0}>Option 2</li>
        </ul>
      )}
    </div>
  );
};
```

## 12. SEGURIDAD

### Regla 12.1: Sanitizar Input del Usuario
```typescript
// ✅ CORRECTO: Sanitización de inputs
import DOMPurify from 'dompurify';

const SafeContent = ({ html }: { html: string }) => {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

// ❌ INCORRECTO: HTML sin sanitizar
const UnsafeContent = ({ html }: { html: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />; // ⚠️ XSS vulnerability
};
```

### Regla 12.2: No Exponer Datos Sensibles
```typescript
// ✅ CORRECTO: Datos sensibles en variables de entorno
// .env
VITE_API_URL=https://api.example.com
# NUNCA exponer: API keys, secrets, tokens

// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  // NO incluir: apiKey, secretKey, etc.
} as const;

// ❌ INCORRECTO: Secretos en el código
const API_KEY = 'sk-1234567890abcdef'; // ❌ NUNCA
```

### Regla 12.3: Validar en Backend, No Solo Frontend
```typescript
// ✅ CORRECTO: Validación frontend + backend
const CreateUserForm = () => {
  const handleSubmit = async (data: CreateUserDto) => {
    // Validación frontend (UX)
    if (!validateEmail(data.email)) {
      setError('Invalid email');
      return;
    }

    try {
      // Backend también valida (seguridad)
      await userService.create(data);
    } catch (error) {
      // Manejar errores de validación del backend
      setError(error.message);
    }
  };
};

// ⚠️ ADVERTENCIA: Solo validar en frontend NO es seguro
```

## 13. ESTILO DE CÓDIGO

### Regla 13.1: Imports Organizados
```typescript
// ✅ CORRECTO: Imports organizados y agrupados
// 1. React y librerías externas
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 2. Componentes internos
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// 3. Hooks personalizados
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';

// 4. Tipos
import type { User, UserRole } from '@/types/user.types';

// 5. Utilidades y constantes
import { formatDate } from '@/utils/formatDate';
import { API_ENDPOINTS } from '@/constants/api';

// 6. Estilos
import './UserProfile.css';

// ❌ INCORRECTO: Imports desordenados
import './styles.css';
import { useState as useState2 } from 'react';
import type { User as User2 } from '@/types/user.types';
import { Button as Button2 } from '@/components/ui/Button';
import { useAuth as useAuth2 } from '@/hooks/useAuth';
```

### Regla 13.2: Constantes en UPPER_CASE
```typescript
// ✅ CORRECTO: Constantes en mayúsculas
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const API_TIMEOUT_MS = 5000;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const;

// Variables normales en camelCase
const userName = 'John';
const isLoading = false;
```

### Regla 13.3: Comentarios Significativos
```typescript
// ✅ CORRECTO: Comentarios útiles
/**
 * Calcula el precio total incluyendo impuestos y descuentos
 * @param basePrice - Precio base del producto
 * @param taxRate - Tasa de impuesto (0.16 para 16%)
 * @param discount - Descuento como decimal (0.1 para 10%)
 * @returns Precio final calculado
 */
const calculateFinalPrice = (
  basePrice: number,
  taxRate: number,
  discount: number
): number => {
  const priceAfterDiscount = basePrice * (1 - discount);
  return priceAfterDiscount * (1 + taxRate);
};

// Explicar decisiones no obvias
// Using setTimeout instead of setInterval to avoid overlap
// when API responses take longer than the interval
const scheduleNextFetch = () => {
  setTimeout(() => {
    fetchData();
  }, REFRESH_INTERVAL);
};

// ❌ INCORRECTO: Comentarios obvios o redundantes
// Incrementa el contador en 1
const increment = () => setCount(count + 1);

// Suma dos números
const add = (a: number, b: number) => a + b;
```

### Regla 13.4: Funciones Pequeñas y Enfocadas
```typescript
// ✅ CORRECTO: Funciones pequeñas y específicas
const validateEmail2 = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword2 = (password: string): boolean => {
  return password.length >= 8;
};
```

## 14. DOCUMENTACIÓN

### Regla 14.1: README.md del Proyecto
```markdown
# Project Name

## 📋 Descripción
Breve descripción del proyecto y su propósito.

## 🚀 Tecnologías
- React 18
- TypeScript 5
- Vite
- TailwindCSS
- React Router

## 📦 Instalación
```bash
npm install
```

## 🛠️ Desarrollo
```bash
npm run dev
```

## 🏗️ Build
```bash
npm run build
```

## 🧪 Tests
```bash
npm run test
```

## 📁 Estructura del Proyecto
```
src/
├── components/     # Componentes reutilizables
├── features/       # Features por dominio
├── hooks/          # Custom hooks
├── services/       # Servicios API
├── types/          # Tipos TypeScript
└── utils/          # Utilidades
```

## 🤝 Contribuir
Ver [CONTRIBUTING.md](CONTRIBUTING.md)
```

### Regla 14.2: Documentar Componentes Complejos
```typescript
/**
 * UserDashboard Component
 * 
 * Displays comprehensive user information including:
 * - Profile details
 * - Activity history
 * - Statistics
 * - Action buttons
 * 
 * @example
 * ```tsx
 * <UserDashboard 
 *   userId="123"
 *   onEdit={(id) => navigate(`/users/${id}/edit`)}
 * />
 * ```
 */
interface UserDashboardProps {
  /** User ID to display */
  userId: string;
  
  /** Callback when edit button is clicked */
  onEdit?: (userId: string) => void;
  
  /** Show/hide statistics section */
  showStats?: boolean;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  userId,
  onEdit,
  showStats = true
}) => {
  // Implementation...
};
```

## 15. CONVENCIONES FINALES

### Regla 15.1: Early Returns
```typescript
// ✅ CORRECTO: Early returns para lógica más clara
const UserProfile = ({ userId }: { userId: string }) => {
  const { user, isLoading, error } = useUser(userId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <NotFound />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
```

### Regla 15.2: Destructuring de Props
```typescript
// ✅ CORRECTO
const Button = ({ text, variant, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{text}</button>;
};

// ❌ INCORRECTO
const ButtonWrong = (props: ButtonProps) => {
  return <button onClick={props.onClick}>{props.text}</button>;
};
```

### Regla 15.3: Evitar Código Duplicado (DRY)
```typescript
// ❌ INCORRECTO: Código duplicado
const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);
  
  return <div>{/* ... */}</div>;
};

const ProductPanel = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);
  
  return <div>{/* ... */}</div>;
};

// ✅ CORRECTO: Lógica reutilizable
const useFetchData = <T,>(url: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);
  
  return { data, loading };
};
```

---

## 🎓 RESUMEN DE PRINCIPIOS CLAVE

- **TypeScript estricto**: NUNCA usar `any`, siempre tipos explícitos
- **Componentes pequeños**: Máximo 150 líneas, una responsabilidad
- **Custom hooks**: Extraer lógica reutilizable
- **Inmutabilidad**: Actualizar estado de forma inmutable
- **Servicios separados**: Lógica de API fuera de componentes
- **Error handling**: try/catch, error boundaries, feedback al usuario
- **Performance**: memo, lazy loading, virtualización cuando sea necesario
- **Accesibilidad**: HTML semántico, ARIA labels, navegación por teclado
- **Seguridad**: sanitizar inputs, validar en backend
- **Clean code**: DRY, funciones pequeñas, early returns

## ✅ CHECKLIST ANTES DE COMMIT

- No hay `any` en el código
- Todos los componentes tienen tipos definidos
- Componentes < 150 líneas
- Custom hooks para lógica reutilizable
- Error handling implementado
- Imports organizados
- Nombres descriptivos (funciones, variables, componentes)
- No hay código duplicado
- Tests escritos (si aplica)
- Accesibilidad considerada

Estas reglas garantizan código React + TypeScript mantenible, escalable y de calidad profesional.
