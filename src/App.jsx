import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const CATALOG_REFRESH_INTERVAL_MS = 5000

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

const normalizeDocumentTypes = (items) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => item?.code && item?.name)
    .map((item) => ({
      code: item.code,
      name: item.name,
    }))
}

const normalizeDepartments = (items) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((department) => department?.code && department?.name)
    .map((department) => ({
      code: department.code,
      name: department.name,
      cities: Array.isArray(department.cities)
        ? department.cities
          .filter((city) => city?.name)
          .map((city) => ({ id: city.id, name: city.name }))
        : [],
    }))
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
  const [documentTypes, setDocumentTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (type, text) => {
    setMessage({ type, text })
  }

  useEffect(() => {
    let isMounted = true

    const loadCatalogs = async () => {
      try {
        const [documentTypesResponse, departmentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/catalog/document-types`),
          fetch(`${API_BASE_URL}/api/catalog/departments`),
        ])

        if (!documentTypesResponse.ok || !departmentsResponse.ok) {
          throw new Error('No fue posible cargar los catálogos.')
        }

        const [documentTypesData, departmentsData] = await Promise.all([
          documentTypesResponse.json(),
          departmentsResponse.json(),
        ])

        if (!isMounted) {
          return
        }

        const nextDocumentTypes = normalizeDocumentTypes(documentTypesData)
        const nextDepartments = normalizeDepartments(departmentsData)

        setDocumentTypes(nextDocumentTypes)
        setDepartments(nextDepartments)

        setProviderForm((currentForm) => {
          const documentTypeExists = !currentForm.documentType
            || nextDocumentTypes.some((type) => type.code === currentForm.documentType)

          const selectedDepartment = nextDepartments.find((department) => department.name === currentForm.department)
          const departmentExists = !currentForm.department || Boolean(selectedDepartment)

          const cityExists = !currentForm.city
            || currentForm.city === 'Otra ciudad'
            || selectedDepartment?.cities.some((city) => city.name === currentForm.city)

          return {
            ...currentForm,
            documentType: documentTypeExists ? currentForm.documentType : '',
            documentNumber: documentTypeExists ? currentForm.documentNumber : '',
            department: departmentExists ? currentForm.department : '',
            city: departmentExists && cityExists ? currentForm.city : '',
            customCity: departmentExists && cityExists ? currentForm.customCity : '',
          }
        })
      } catch (error) {
        console.error('No fue posible cargar los catálogos.', error)
      }
    }

    loadCatalogs()
    const intervalId = window.setInterval(loadCatalogs, CATALOG_REFRESH_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (auth0Error) {
      showMessage('error', `Error de autenticación: ${auth0Error.message}`)
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
        showMessage('success', 'Inicio de sesión exitoso.')
      } catch (error) {
        showMessage('error', `No fue posible iniciar sesión con Google: ${error.message}`)
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
      <section className={`brand-panel ${!session ? 'auth-brand' : 'workspace-brand'}`}>
        <div className="brand-badge">O</div>
        <h1>Ordexxa</h1>

        {!session && (
          <div className="brand-summary">
            <span>Acceso administrativo</span>
            <strong>Gestión segura de proveedores</strong>
            <p>Inicia sesión para administrar la información comercial de Ordexxa.</p>
          </div>
        )}

        {session && screen === 'dashboard' && (
          <div className="brand-summary">
            <span>Panel administrativo</span>
            <strong>Operación comercial</strong>
            <p>Consulta los módulos disponibles para gestionar la operación de la microempresa.</p>
          </div>
        )}

        {session && screen === 'providers' && (
          <div className="brand-summary">
            <span>Gestión de proveedores</span>
            <strong>Registro de proveedores</strong>
            <p>Administra la información básica de proveedores para compras, pedidos e inventario.</p>
          </div>
        )}
      </section>

      <section className="content-panel">
        {message && (
          <div className={`alert ${message.type}`}>
            {message.text}
          </div>
        )}

        {!session && screen === 'login' && (
          <AuthCard title="Iniciar sesión" subtitle="Accede al panel administrativo con tu cuenta autorizada.">
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
                {isAuth0Loading ? 'Conectando con Google...' : 'Iniciar sesión con Google'}
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
            documentTypes={documentTypes}
            departments={departments}
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
    { title: 'Pedidos', description: 'Registrar, consultar y hacer seguimiento de pedidos.', enabled: false },
    { title: 'Inventario', description: 'Consultar disponibilidad y control de productos.', enabled: false },
    { title: 'Ventas', description: 'Registrar ventas y consultar reportes comerciales.', enabled: false },
    { title: 'Usuarios', description: 'Administrar usuarios, roles y permisos de acceso.', enabled: false },
    { title: 'Notificaciones', description: 'Revisar alertas y comunicaciones del sistema.', enabled: false },
  ]

  return (
    <div className="workspace">
      <Header session={session} logout={logout} />

      <section className="hero">
        <div>
          <p className="eyebrow">Panel de control</p>
          <h2>Bienvenido a Ordexxa</h2>
          <p>Selecciona el módulo habilitado para administrar la operación comercial.</p>
        </div>
      </section>

      <section className="notifications">
        <h3>Estado general</h3>
        <p>Sesión activa. El módulo de proveedores está disponible para registro y consulta operativa.</p>
      </section>

      <div className="module-grid">
        {modules.map((module) => (
          <button
            key={module.title}
            className={`module-card ${module.enabled ? 'enabled' : 'disabled'}`}
            onClick={module.enabled ? openProviders : undefined}
            disabled={!module.enabled}
          >
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            {module.enabled && <span>Abrir módulo</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProvidersPanel({ session, form, setForm, loading, documentTypes, departments, onSubmit, onBack, logout }) {
  return (
    <div className="workspace">
      <Header session={session} logout={logout} />

      <button className="back-button" onClick={onBack}>← Volver al dashboard</button>

      <section className="provider-layout">
        <div>
          <p className="eyebrow">Gestión de proveedores</p>
          <h2>Registrar proveedor</h2>
          <p>
            Registra la información básica del proveedor para mantener actualizada la operación comercial.
          </p>

          <div className="technical-note">
            La información registrada sirve como base para compras, pedidos e inventario.
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
            options={documentTypes.map((type) => type.code)}
            optionLabels={documentTypes.reduce((labels, type) => ({ ...labels, [type.code]: type.name }), {})}
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
            options={departments.map((department) => department.name)}
            onChange={(value) => setForm({ ...form, department: value, city: '', customCity: '' })}
            required
          />
          <Select
            label="Ciudad"
            value={form.city}
            options={departments.find((department) => department.name === form.department)?.cities.map((city) => city.name) ?? []}
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
        <strong>Ordexxa</strong>
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
