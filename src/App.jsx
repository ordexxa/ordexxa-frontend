import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const DOCUMENT_TYPES = [
  { code: 'NIT', name: 'NIT - Número de Identificación Tributaria' },
  { code: 'CC', name: 'CC - Cédula de ciudadanía' },
  { code: 'CE', name: 'CE - Cédula de extranjería' },
  { code: 'PASAPORTE', name: 'Pasaporte' },
]

const DEPARTMENT_CITIES = {
  'Amazonas': ['Leticia', 'Puerto Nariño', 'Otra ciudad'],
  'Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Apartadó', 'Turbo', 'Otra ciudad'],
  'Arauca': ['Arauca', 'Saravena', 'Tame', 'Otra ciudad'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Otra ciudad'],
  'Bogotá D.C.': ['Bogotá', 'Otra ciudad'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'Otra ciudad'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Otra ciudad'],
  'Caldas': ['Manizales', 'Villamaría', 'La Dorada', 'Chinchiná', 'Otra ciudad'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán', 'Otra ciudad'],
  'Casanare': ['Yopal', 'Aguazul', 'Villanueva', 'Otra ciudad'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Otra ciudad'],
  'Cesar': ['Valledupar', 'Aguachica', 'La Jagua de Ibirico', 'Otra ciudad'],
  'Chocó': ['Quibdó', 'Istmina', 'Acandí', 'Otra ciudad'],
  'Córdoba': ['Montería', 'Lorica', 'Sahagún', 'Cereté', 'Otra ciudad'],
  'Cundinamarca': ['Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Girardot', 'Fusagasugá', 'Otra ciudad'],
  'Guainía': ['Inírida', 'Otra ciudad'],
  'Guaviare': ['San José del Guaviare', 'Otra ciudad'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Otra ciudad'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Otra ciudad'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'Otra ciudad'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Otra ciudad'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'Otra ciudad'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Otra ciudad'],
  'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito', 'Otra ciudad'],
  'Quindío': ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'Otra ciudad'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Otra ciudad'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia', 'Otra ciudad'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'Otra ciudad'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués', 'Otra ciudad'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Otra ciudad'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Buga', 'Cartago', 'Otra ciudad'],
  'Vaupés': ['Mitú', 'Otra ciudad'],
  'Vichada': ['Puerto Carreño', 'Otra ciudad'],
}

const initialProviderForm = {
  businessName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  phoneNumber: '',
  department: '',
  city: '',
  customCity: '',
  addressLine: '',
}

function App() {
  const {
    loginWithRedirect,
    logout: auth0Logout,
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
    user: auth0User,
    getAccessTokenSilently,
    error: auth0Error,
  } = useAuth0()

  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('login')

  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
  })

  const [verifyForm, setVerifyForm] = useState({
    email: '',
    code: '',
  })

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [providerForm, setProviderForm] = useState(initialProviderForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (type, text) => {
    setMessage({ type, text })
  }

  useEffect(() => {
    if (auth0Error) {
      showMessage('error', `Error de Auth0: ${auth0Error.message}`)
    }
  }, [auth0Error])

  useEffect(() => {
    const loadAuth0Session = async () => {
      if (!isAuth0Authenticated || !auth0User) {
        return
      }

      try {
        const token = await getAccessTokenSilently()
        const newSession = {
          email: auth0User.email,
          fullName: auth0User.name || auth0User.nickname || auth0User.email,
          role: 'ADMIN',
          token,
          authProvider: 'AUTH0',
        }

        setSession(newSession)
        setScreen('dashboard')
        showMessage('success', 'Inicio de sesión con Auth0 exitoso.')
      } catch (error) {
        showMessage('error', `No fue posible obtener el token de Auth0: ${error.message}`)
      }
    }

    loadAuth0Session()
  }, [isAuth0Authenticated, auth0User, getAccessTokenSilently])

  const handleAuth0Login = async () => {
    setMessage(null)
    await loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
      },
    })
  }

  const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,80}$/.test(password)
  }

  const request = async (path, body, requiresAuth = false) => {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (requiresAuth && session?.token) {
      headers.Authorization = `Bearer ${session.token}`
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMessage = data?.messages?.[0] || data?.message || 'Ocurrió un error al procesar la solicitud.'
      throw new Error(errorMessage)
    }

    return data
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!isStrongPassword(registerForm.password)) {
      showMessage('error', 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.')
      setLoading(false)
      return
    }

    try {
      const data = await request('/api/auth/register', registerForm)
      setVerifyForm({ email: data.email, code: '' })
      showMessage('success', 'Cuenta creada. Revisa tu correo de verificación. Puede tardar unos minutos. Si no lo encuentras, revisa Spam, Correo no deseado o Promociones.')
      setScreen('verify')
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const data = await request('/api/auth/verify', verifyForm)
      showMessage('success', data.message)
      setLoginForm({ email: verifyForm.email, password: '' })
      setScreen('login')
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const data = await request('/api/auth/login', loginForm)
      const newSession = {
        email: data.email,
        fullName: data.fullName,
        token: data.token,
      }

      setSession(newSession)
      setLoginForm({ email: '', password: '' })
      showMessage('success', data.message)
      setScreen('dashboard')
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const selectedCity = providerForm.city === 'Otra ciudad'
        ? providerForm.customCity
        : providerForm.city

      const payload = {
        businessName: providerForm.businessName,
        documentType: providerForm.documentType,
        documentNumber: providerForm.documentNumber,
        email: providerForm.email,
        phoneNumber: providerForm.phoneNumber,
        address: `${providerForm.addressLine}, ${selectedCity}, ${providerForm.department}`,
      }

      const data = await request('/api/proveedores', payload, true)
      showMessage('success', `${data.message}. Documento: ${data.documentNumber}`)
      setProviderForm(initialProviderForm)
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    const isAuth0Session = session?.authProvider === 'AUTH0'

    try {
      if (session?.token && !isAuth0Session) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        })
      }
    } catch {
      // En caso de error de red, se limpia la sesión local para no bloquear al usuario.
    }

    localStorage.removeItem('ordexxa-session')
    sessionStorage.removeItem('ordexxa-session')
    setSession(null)
    setLoginForm({ email: '', password: '' })
    setRegisterForm({ fullName: '', email: '', password: '' })
    setVerifyForm({ email: '', code: '' })
    setProviderForm(initialProviderForm)
    setScreen('login')
    setMessage(null)

    if (isAuth0Session) {
      auth0Logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      })
    }
  }

  const goDashboard = () => {
    setMessage(null)
    setScreen('dashboard')
  }

  return (
    <main className="app-shell">
      <section className="brand-panel">
        <div className="brand-badge">O</div>
        <h1>OrDexxa</h1>
        <p>Gestión de ventas y pedidos.</p>

        <div className="flow-card">
          <span>Panel administrativo</span>
          <strong>Registro de proveedores</strong>
          <span>Gestión comercial</span>
          <span>Gestión de ventas y pedidos</span>
        </div>
      </section>

      <section className="content-panel">
        {message && (
          <div className={`alert ${message.type}`}>
            {message.text}
          </div>
        )}

        {!session && screen === 'login' && (
          <AuthCard title="Iniciar sesión" subtitle="Ingresa con tu correo y contraseña.">
            <form onSubmit={handleLogin} className="form" autoComplete="off">
              <Input
                label="Correo"
                type="email"
                value={loginForm.email}
                onChange={(value) => setLoginForm({ ...loginForm, email: value })}
                autoComplete="off"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={loginForm.password}
                onChange={(value) => setLoginForm({ ...loginForm, password: value })}
                autoComplete="off"
                required
              />

              <button disabled={loading} className="primary-button">
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>

              <button
                type="button"
                disabled={isAuth0Loading}
                className="secondary-button"
                onClick={handleAuth0Login}
              >
                {isAuth0Loading ? 'Conectando con Auth0...' : 'Ingresar con Google / Auth0'}
              </button>

              <button type="button" className="link-button" onClick={() => {
                setMessage(null)
                setRegisterForm({ fullName: '', email: '', password: '' })
                setScreen('register')
              }}>
                Crear cuenta nueva
              </button>
            </form>
          </AuthCard>
        )}

        {!session && screen === 'register' && (
          <AuthCard title="Crear cuenta" subtitle="Registra un usuario para acceder al sistema.">
            <form onSubmit={handleRegister} className="form" autoComplete="off">
              <Input
                label="Nombre completo"
                value={registerForm.fullName}
                onChange={(value) => setRegisterForm({ ...registerForm, fullName: value })}
                autoComplete="off"
                required
              />
              <Input
                label="Correo"
                type="email"
                value={registerForm.email}
                onChange={(value) => setRegisterForm({ ...registerForm, email: value })}
                autoComplete="off"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={registerForm.password}
                onChange={(value) => setRegisterForm({ ...registerForm, password: value })}
                autoComplete="new-password"
                minLength={8}
                maxLength={80}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,80}"
                title="Debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial."
                required
              />
              <small className="field-help">
                Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
              </small>

              <button disabled={loading} className="primary-button">
                {loading ? 'Creando...' : 'Crear cuenta'}
              </button>

              <button type="button" className="link-button" onClick={() => {
                setMessage(null)
                setLoginForm({ email: '', password: '' })
                setScreen('login')
              }}>
                Ya tengo cuenta
              </button>
            </form>
          </AuthCard>
        )}

        {!session && screen === 'verify' && (
          <AuthCard title="Verificar cuenta" subtitle="Ingresa el código de verificación para activar tu cuenta.">
            <form onSubmit={handleVerify} className="form" autoComplete="off">
              <Input
                label="Correo"
                type="email"
                value={verifyForm.email}
                onChange={(value) => setVerifyForm({ ...verifyForm, email: value })}
                required
              />
              <Input
                label="Código de verificación"
                value={verifyForm.code}
                onChange={(value) => setVerifyForm({ ...verifyForm, code: value })}
                required
              />
<button disabled={loading} className="primary-button">
                {loading ? 'Verificando...' : 'Verificar cuenta'}
              </button>

              <button type="button" className="link-button" onClick={() => {
                setMessage(null)
                setScreen('login')
              }}>
                Volver al inicio de sesión
              </button>
            </form>
          </AuthCard>
        )}

        {session && screen === 'dashboard' && (
          <Dashboard session={session} logout={logout} openProviders={() => {
            setMessage(null)
            setScreen('providers')
          }} />
        )}

        {session && screen === 'providers' && (
          <ProvidersPanel
            session={session}
            form={providerForm}
            setForm={setProviderForm}
            loading={loading}
            onSubmit={handleProviderSubmit}
            onBack={goDashboard}
            logout={logout}
          />
        )}
      </section>
    </main>
  )
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-card">
      <p className="eyebrow">Panel de control</p>
      <h2>{title}</h2>
      <p className="subtitle">{subtitle}</p>
      {children}
    </div>
  )
}

function Dashboard({ session, logout, openProviders }) {
  const modules = [
    { title: 'Gestión de proveedores', description: 'Registrar y consultar proveedores.', enabled: true },
    { title: 'Pedidos', description: 'Consulta y seguimiento de pedidos.', enabled: false },
    { title: 'Inventario', description: 'Control de productos disponibles.', enabled: false },
    { title: 'Ventas', description: 'Registro y análisis de ventas.', enabled: false },
    { title: 'Usuarios', description: 'Roles y control de acceso.', enabled: false },
    { title: 'Notificaciones', description: 'Alertas y mensajes del sistema.', enabled: false },
  ]

  return (
    <div className="workspace">
      <Header session={session} logout={logout} />

      <section className="hero">
        <div>
          <p className="eyebrow">Panel de control</p>
          <h2>Bienvenido a OrDexxa</h2>
          <p>Selecciona un módulo para gestionar la operación de OrDexxa.</p>
        </div>
      </section>

      <section className="notifications">
        <h3>Estado general</h3>
        <p>Cuenta verificada correctamente. Ya puedes gestionar proveedores desde el módulo habilitado.</p>
      </section>

      <div className="module-grid">
        {modules.map((module) => (
          <button
            key={module.title}
            className={`module-card ${module.enabled ? 'enabled' : 'disabled'}`}
            onClick={module.enabled ? openProviders : undefined}
          >
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <span>{module.enabled ? 'Abrir módulo' : 'Preparado para expansión'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProvidersPanel({ session, form, setForm, loading, onSubmit, onBack, logout }) {
  return (
    <div className="workspace">
      <Header session={session} logout={logout} />

      <button className="back-button" onClick={onBack}>← Volver al dashboard</button>

      <section className="provider-layout">
        <div>
          <p className="eyebrow">Gestión de proveedores</p>
          <h2>Registrar proveedor</h2>
          <p>
            Registra proveedores para mantener actualizada la información comercial de OrDexxa.
          </p>

          <div className="technical-note">
            Los datos registrados quedan disponibles para la operación de compras, pedidos e inventario.
          </div>
        </div>

        <form onSubmit={onSubmit} className="form provider-form">
          <Input
            label="Razón social"
            value={form.businessName}
            onChange={(value) => setForm({ ...form, businessName: value })}
            required
          />
          <Select
            label="Tipo de documento"
            value={form.documentType}
            options={DOCUMENT_TYPES.map((type) => type.code)}
            optionLabels={DOCUMENT_TYPES.reduce((labels, type) => ({ ...labels, [type.code]: type.name }), {})}
            onChange={(value) => setForm({ ...form, documentType: value, documentNumber: '' })}
            required
          />
          <Input
            label="Número de documento"
            value={form.documentNumber}
            onChange={(value) => setForm({ ...form, documentNumber: value })}
            required
          />
          <small className="field-help">
            NIT, CC y CE solo aceptan números. Pasaporte acepta letras y números.
          </small>
          <Input
            label="Correo"
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
            required
          />
          <Input
            label="Teléfono"
            value={form.phoneNumber}
            onChange={(value) => setForm({ ...form, phoneNumber: value })}
            required
          />
          <Select
            label="Departamento"
            value={form.department}
            options={Object.keys(DEPARTMENT_CITIES)}
            onChange={(value) => setForm({ ...form, department: value, city: '', customCity: '' })}
            required
          />
          <Select
            label="Ciudad"
            value={form.city}
            options={form.department ? DEPARTMENT_CITIES[form.department] : []}
            onChange={(value) => setForm({ ...form, city: value, customCity: '' })}
            required
            disabled={!form.department}
          />
          {form.city === 'Otra ciudad' && (
            <Input
              label="Nombre de la ciudad"
              value={form.customCity}
              onChange={(value) => setForm({ ...form, customCity: value })}
              required
            />
          )}
          <Input
            label="Dirección específica"
            value={form.addressLine}
            onChange={(value) => setForm({ ...form, addressLine: value })}
            required
          />

          <button disabled={loading} className="primary-button">
            {loading ? 'Registrando...' : 'Registrar proveedor'}
          </button>
        </form>
      </section>
    </div>
  )
}

function Header({ session, logout }) {
  return (
    <header className="workspace-header">
      <div>
        <strong>OrDexxa</strong>
        <span>{session.fullName} · {session.email}</span>
      </div>
      <button className="secondary-button" onClick={logout}>Cerrar sesión</button>
    </header>
  )
}

function Select({ label, value, options, optionLabels = {}, onChange, required = false, disabled = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{disabled ? 'Selecciona primero un departamento' : 'Selecciona una opción'}</option>
        {options.map((option) => (
          <option key={option} value={option}>{optionLabels[option] || option}</option>
        ))}
      </select>
    </label>
  )
}

function Input({ label, value, onChange, type = 'text', required = false, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  )
}

export default App
