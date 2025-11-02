import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { ArrowLeft, Copy, Eye } from 'lucide-react'
import { formatDate } from '../../utils/format'
import type { VerificationInitiateResponse, Verification } from '../../types'
import { websocketService } from '../../services/websocketService'
import { verificationService } from '../../services/verificationService'
import type { 
  DocumentVerificationRequest, 
  DocumentVerificationResponse,
  BiometricsFaceMatchRequest,
  BiometricsFaceMatchResponse,
  BiometricsRegistrationRequest,
  BiometricsRegistrationResponse,
  BiometricVerificationRequest,
  BiometricVerificationResponse,
  CustomDocumentVerificationRequest,
  CustomDocumentVerificationResponse,
  PhLtoDriversLicenseRequest,
  PhNationalPoliceRequest,
  PhNbiRequest,
  PhPrcRequest,
  PhPrcRequestByLicense,
  PhPrcRequestByName,
  PhSssRequest,
  GovernmentDataVerificationResponse,
} from '../../types'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import { useEffect, useMemo, useState } from 'react'
import { TEMPLATES, PLAN_ID_TO_CARDS } from '../../constants/templates'

// Type for Philsys Face Liveness SDK Response
interface PhilsysLivenessResponse {
  status: string
  result: {
    photo?: string
    session_id?: string
    photo_url?: string
    error?: boolean
    message?: string
  }
  message?: string
}

// Extend window object to include IDmeta Philsys Liveness SDK
declare global {
  interface Window {
    IDmetaPhilsysLiveness?: () => {
      start: (options: { verificationId: string; token: string }) => Promise<PhilsysLivenessResponse>
    }
    _idmetaSDKLoadFailed?: boolean
  }
}

export default function ValidationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [apiResponse] = useState<VerificationInitiateResponse | null>(
    location.state?.response || null
  )
  const [verificationStatus, setVerificationStatus] = useState<string>('')

  // State to store verification data from WebSocket updates
  const [verification, setVerification] = useState<Verification | null>(null)
  
  // Philsys Face Liveness states
  const [philsysResponse, setPhilsysResponse] = useState<PhilsysLivenessResponse | null>(null)
  const [isPhilsysTesting, setIsPhilsysTesting] = useState(false)
  const [philsysError, setPhilsysError] = useState<string | null>(null)
  const [sdkLoaded, setSDKLoaded] = useState(false)
  const [sdkLoadFailed, setSDKLoadFailed] = useState(false)
  const [showSDKWarning, setShowSDKWarning] = useState(false)
  // PhilSys submit states
  const [pcn, setPcn] = useState('')
  const [isSubmittingPhilsys, setIsSubmittingPhilsys] = useState(false)
  // Template selection (drives which verification cards render)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(() => {
    const fromState = (location.state as any)?.selectedTemplateId as number | undefined
    if (fromState) return fromState
    if (!verificationId) return 425
    const saved = localStorage.getItem(`selected_template_${verificationId}`)
    return saved ? Number(saved) : 425
  })
  // Persisted last submission result
  const [lastPhilsysSubmission, setLastPhilsysSubmission] = useState<{
    pcn: string
    faceLivenessSessionId: string
    status: string
    timestamp: string
  } | null>(null)

  // Document Verification states
  const [docTemplateId, setDocTemplateId] = useState('')
  const [docFrontDataUrl, setDocFrontDataUrl] = useState<string>('')
  const [docBackDataUrl, setDocBackDataUrl] = useState<string>('')
  const [docError, setDocError] = useState<string | null>(null)
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false)
  const [lastDocResponse, setLastDocResponse] = useState<DocumentVerificationResponse | null>(null)

  // Biometrics Verification states
  const [biometricVerificationImageUrl, setBiometricVerificationImageUrl] = useState<string>('')
  const [biometricRegistrationImageUrl, setBiometricRegistrationImageUrl] = useState<string>('')
  const [biometricUsername, setBiometricUsername] = useState('')
  const [biometricError, setBiometricError] = useState<string | null>(null)
  const [isSubmittingBiometric, setIsSubmittingBiometric] = useState(false)
  const [biometricVerificationResponse, setBiometricVerificationResponse] = useState<BiometricVerificationResponse | null>(null)
  const [biometricRegistrationResponse, setBiometricRegistrationResponse] = useState<BiometricsRegistrationResponse | null>(null)

  // Biometrics Face Match states
  const [faceMatchImage1Url, setFaceMatchImage1Url] = useState<string>('')
  const [faceMatchImage2Url, setFaceMatchImage2Url] = useState<string>('')
  const [faceMatchError, setFaceMatchError] = useState<string | null>(null)
  const [isSubmittingFaceMatch, setIsSubmittingFaceMatch] = useState(false)
  const [faceMatchResponse, setFaceMatchResponse] = useState<BiometricsFaceMatchResponse | null>(null)

  // Custom Document Verification states
  const [customDocImageUrl, setCustomDocImageUrl] = useState<string>('')
  const [customDocError, setCustomDocError] = useState<string | null>(null)
  const [isSubmittingCustomDoc, setIsSubmittingCustomDoc] = useState(false)
  const [customDocResponse, setCustomDocResponse] = useState<CustomDocumentVerificationResponse | null>(null)

  // PH Government Data Verification states
  const [phLtoLicenseNo, setPhLtoLicenseNo] = useState('')
  const [phLtoError, setPhLtoError] = useState<string | null>(null)
  const [isSubmittingPhLto, setIsSubmittingPhLto] = useState(false)
  const [phLtoResponse, setPhLtoResponse] = useState<GovernmentDataVerificationResponse | null>(null)

  const [phNationalPoliceSurname, setPhNationalPoliceSurname] = useState('')
  const [phNationalPoliceClearanceNo, setPhNationalPoliceClearanceNo] = useState('')
  const [phNationalPoliceError, setPhNationalPoliceError] = useState<string | null>(null)
  const [isSubmittingPhNationalPolice, setIsSubmittingPhNationalPolice] = useState(false)
  const [phNationalPoliceResponse, setPhNationalPoliceResponse] = useState<GovernmentDataVerificationResponse | null>(null)

  const [phNbiClearanceNo, setPhNbiClearanceNo] = useState('')
  const [phNbiError, setPhNbiError] = useState<string | null>(null)
  const [isSubmittingPhNbi, setIsSubmittingPhNbi] = useState(false)
  const [phNbiResponse, setPhNbiResponse] = useState<GovernmentDataVerificationResponse | null>(null)

  const [phPrcProfession, setPhPrcProfession] = useState('')
  const [phPrcLicenseNo, setPhPrcLicenseNo] = useState('')
  const [phPrcDateOfBirth, setPhPrcDateOfBirth] = useState('')
  const [phPrcFirstName, setPhPrcFirstName] = useState('')
  const [phPrcLastName, setPhPrcLastName] = useState('')
  const [phPrcSearchBy, setPhPrcSearchBy] = useState<'license' | 'name'>('license')
  const [phPrcError, setPhPrcError] = useState<string | null>(null)
  const [isSubmittingPhPrc, setIsSubmittingPhPrc] = useState(false)
  const [phPrcResponse, setPhPrcResponse] = useState<GovernmentDataVerificationResponse | null>(null)

  const [phSssNumber, setPhSssNumber] = useState('')
  const [phSssError, setPhSssError] = useState<string | null>(null)
  const [isSubmittingPhSss, setIsSubmittingPhSss] = useState(false)
  const [phSssResponse, setPhSssResponse] = useState<GovernmentDataVerificationResponse | null>(null)

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // ~10MB

  // Keep doc templateId aligned with selected template
  useEffect(() => {
    setDocTemplateId(String(selectedTemplateId || ''))
  }, [selectedTemplateId])

  // Persist template selection per verification
  useEffect(() => {
    if (!verificationId) return
    localStorage.setItem(`selected_template_${verificationId}`, String(selectedTemplateId))
  }, [verificationId, selectedTemplateId])

  // allowedCards moved below useQuery to avoid TDZ with verificationData

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = (e) => reject(e)
      reader.readAsDataURL(file)
    })
  }

  const validateImageFile = (file: File): string | null => {
    const isSupported = ['image/jpeg', 'image/png'].includes(file.type)
    if (!isSupported) return 'Unsupported image type. Use JPG or PNG.'
    if (file.size > MAX_IMAGE_BYTES) return 'Image is too large. Max size is ~10MB.'
    return null
  }

  const handlePickFront = async (file?: File) => {
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setDocError(err)
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setDocFrontDataUrl(dataUrl)
    setDocError(null)
  }

  const handlePickBack = async (file?: File) => {
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setDocError(err)
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setDocBackDataUrl(dataUrl)
    setDocError(null)
  }

  const handleSubmitDocument = async () => {
    if (!verificationId) {
      setDocError('Missing verificationId.')
      return
    }
    if (!docTemplateId.trim()) {
      setDocError('templateId is required.')
      return
    }
    if (!docFrontDataUrl) {
      setDocError('Front image is required.')
      return
    }

    setIsSubmittingDoc(true)
    setDocError(null)
    try {
      const payload: DocumentVerificationRequest = {
        templateId: docTemplateId.trim(),
        imageFrontSide: docFrontDataUrl,
        imageBackSide: docBackDataUrl || undefined,
      }
      const resp = await verificationService.submitDocument(verificationId, payload)
      setLastDocResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      if (e?.statusCode === 400) {
        setDocError(e?.message || 'Invalid request. Check images and templateId.')
      } else if (e?.statusCode === 401 || e?.statusCode === 403) {
        setDocError('Authentication failed. Please login or set API key.')
      } else {
        setDocError(e?.message || 'Failed to submit document verification.')
      }
    } finally {
      setIsSubmittingDoc(false)
    }
  }

  // Biometrics Verification Handler
  const handleBiometricVerification = async () => {
    if (!verificationId) {
      setBiometricError('Missing verificationId.')
      return
    }
    if (!biometricVerificationImageUrl) {
      setBiometricError('Image is required.')
      return
    }

    setIsSubmittingBiometric(true)
    setBiometricError(null)
    try {
      const payload: BiometricVerificationRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        image: biometricVerificationImageUrl,
      }
      const resp = await apiClient.post<BiometricVerificationResponse>(API_ENDPOINTS.BIOMETRICS_VERIFICATION, payload)
      setBiometricVerificationResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setBiometricError(e?.message || 'Failed to submit biometric verification.')
    } finally {
      setIsSubmittingBiometric(false)
    }
  }

  // Biometrics Registration Handler
  const handleBiometricRegistration = async () => {
    if (!verificationId) {
      setBiometricError('Missing verificationId.')
      return
    }
    if (!biometricUsername.trim()) {
      setBiometricError('Username is required.')
      return
    }
    if (!biometricRegistrationImageUrl) {
      setBiometricError('Image is required.')
      return
    }

    setIsSubmittingBiometric(true)
    setBiometricError(null)
    try {
      const payload: BiometricsRegistrationRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        username: biometricUsername.trim(),
        image: biometricRegistrationImageUrl,
      }
      const resp = await apiClient.post<BiometricsRegistrationResponse>(API_ENDPOINTS.BIOMETRICS_REGISTRATION, payload)
      setBiometricRegistrationResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setBiometricError(e?.message || 'Failed to submit biometric registration.')
    } finally {
      setIsSubmittingBiometric(false)
    }
  }

  // Biometrics Face Match Handler
  const handleFaceMatch = async () => {
    if (!verificationId) {
      setFaceMatchError('Missing verificationId.')
      return
    }
    if (!faceMatchImage1Url || !faceMatchImage2Url) {
      setFaceMatchError('Both images are required.')
      return
    }

    setIsSubmittingFaceMatch(true)
    setFaceMatchError(null)
    try {
      const payload: BiometricsFaceMatchRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        image1: faceMatchImage1Url,
        image2: faceMatchImage2Url,
      }
      const resp = await apiClient.post<BiometricsFaceMatchResponse>(API_ENDPOINTS.BIOMETRICS_FACE_MATCH, payload)
      setFaceMatchResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setFaceMatchError(e?.message || 'Failed to submit face match.')
    } finally {
      setIsSubmittingFaceMatch(false)
    }
  }

  // Custom Document Verification Handler
  const handleCustomDocument = async () => {
    if (!verificationId) {
      setCustomDocError('Missing verificationId.')
      return
    }

    setIsSubmittingCustomDoc(true)
    setCustomDocError(null)
    try {
      const payload: CustomDocumentVerificationRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        document: customDocImageUrl || undefined,
      }
      const resp = await apiClient.post<CustomDocumentVerificationResponse>(API_ENDPOINTS.CUSTOM_DOCUMENT, payload)
      setCustomDocResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setCustomDocError(e?.message || 'Failed to submit custom document.')
    } finally {
      setIsSubmittingCustomDoc(false)
    }
  }

  // PH LTO Drivers License Handler
  const handlePhLto = async () => {
    if (!verificationId) {
      setPhLtoError('Missing verificationId.')
      return
    }
    if (!phLtoLicenseNo.trim()) {
      setPhLtoError('License number is required.')
      return
    }

    setIsSubmittingPhLto(true)
    setPhLtoError(null)
    try {
      const payload: PhLtoDriversLicenseRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        licenseNo: phLtoLicenseNo.trim(),
      }
      const resp = await apiClient.post<GovernmentDataVerificationResponse>(API_ENDPOINTS.PH_LTO_DRIVERS_LICENSE, payload)
      setPhLtoResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setPhLtoError(e?.message || 'Failed to submit PH LTO verification.')
    } finally {
      setIsSubmittingPhLto(false)
    }
  }

  // PH National Police Handler
  const handlePhNationalPolice = async () => {
    if (!verificationId) {
      setPhNationalPoliceError('Missing verificationId.')
      return
    }
    if (!phNationalPoliceSurname.trim()) {
      setPhNationalPoliceError('Surname is required.')
      return
    }
    if (!phNationalPoliceClearanceNo.trim()) {
      setPhNationalPoliceError('Clearance number is required.')
      return
    }

    setIsSubmittingPhNationalPolice(true)
    setPhNationalPoliceError(null)
    try {
      const payload: PhNationalPoliceRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        surname: phNationalPoliceSurname.trim(),
        clearanceNo: phNationalPoliceClearanceNo.trim(),
      }
      const resp = await apiClient.post<GovernmentDataVerificationResponse>(API_ENDPOINTS.PH_NATIONAL_POLICE, payload)
      setPhNationalPoliceResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setPhNationalPoliceError(e?.message || 'Failed to submit PH National Police verification.')
    } finally {
      setIsSubmittingPhNationalPolice(false)
    }
  }

  // PH NBI Handler
  const handlePhNbi = async () => {
    if (!verificationId) {
      setPhNbiError('Missing verificationId.')
      return
    }
    if (!phNbiClearanceNo.trim()) {
      setPhNbiError('Clearance number is required.')
      return
    }

    setIsSubmittingPhNbi(true)
    setPhNbiError(null)
    try {
      const payload: PhNbiRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        clearanceNo: phNbiClearanceNo.trim(),
      }
      const resp = await apiClient.post<GovernmentDataVerificationResponse>(API_ENDPOINTS.PH_NBI, payload)
      setPhNbiResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setPhNbiError(e?.message || 'Failed to submit PH NBI verification.')
    } finally {
      setIsSubmittingPhNbi(false)
    }
  }

  // PH PRC Handler
  const handlePhPrc = async () => {
    if (!verificationId) {
      setPhPrcError('Missing verificationId.')
      return
    }
    if (!phPrcProfession.trim()) {
      setPhPrcError('Profession is required.')
      return
    }

    if (phPrcSearchBy === 'license') {
      if (!phPrcLicenseNo.trim() || !phPrcDateOfBirth.trim()) {
        setPhPrcError('License number and date of birth are required.')
        return
      }
    } else {
      if (!phPrcFirstName.trim() || !phPrcLastName.trim()) {
        setPhPrcError('First name and last name are required.')
        return
      }
    }

    setIsSubmittingPhPrc(true)
    setPhPrcError(null)
    try {
      let payload: PhPrcRequest
      if (phPrcSearchBy === 'license') {
        payload = {
          verificationId,
          templateId: String(selectedTemplateId),
          profession: phPrcProfession.trim(),
          licenseNo: phPrcLicenseNo.trim(),
          dateOfBirth: phPrcDateOfBirth.trim(),
        } as PhPrcRequestByLicense
      } else {
        payload = {
          verificationId,
          templateId: String(selectedTemplateId),
          profession: phPrcProfession.trim(),
          firstName: phPrcFirstName.trim(),
          lastName: phPrcLastName.trim(),
        } as PhPrcRequestByName
      }
      const resp = await apiClient.post<GovernmentDataVerificationResponse>(API_ENDPOINTS.PH_PRC, payload)
      setPhPrcResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setPhPrcError(e?.message || 'Failed to submit PH PRC verification.')
    } finally {
      setIsSubmittingPhPrc(false)
    }
  }

  // PH SSS Handler
  const handlePhSss = async () => {
    if (!verificationId) {
      setPhSssError('Missing verificationId.')
      return
    }
    if (!phSssNumber.trim()) {
      setPhSssError('SSS number is required.')
      return
    }

    setIsSubmittingPhSss(true)
    setPhSssError(null)
    try {
      const payload: PhSssRequest = {
        verificationId,
        templateId: String(selectedTemplateId),
        crnSsNumber: phSssNumber.trim(),
      }
      const resp = await apiClient.post<GovernmentDataVerificationResponse>(API_ENDPOINTS.PH_SSS, payload)
      setPhSssResponse(resp)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => (prev ? { ...prev, status: resp.status } as any : prev))
      }
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      setPhSssError(e?.message || 'Failed to submit PH SSS verification.')
    } finally {
      setIsSubmittingPhSss(false)
    }
  }

  // Load verification data if not provided via location state
  const { data: verificationData, isLoading: isLoadingVerification, refetch: refetchVerification } = useQuery<Verification>({
    queryKey: ['verification', verificationId],
    queryFn: () => apiClient.get<Verification>(`${API_ENDPOINTS.TENANT_VERIFICATIONS}/${verificationId}`),
    // Enable fetch if we have a verificationId and either no initiate response
    // or the initiate response is missing external_verification_id
    enabled: !!verificationId && (!apiResponse || !apiResponse.external_verification_id),
  })

  // Detect external_verification_id mismatch between initiated response and fetched verification
  const externalIdFromData = verificationData?.external_verification_id
  const externalIdFromInit = apiResponse?.external_verification_id || verification?.external_verification_id
  const externalIdMismatch = !!(externalIdFromData && externalIdFromInit && externalIdFromData !== externalIdFromInit)

  // Compute which cards to render based on backend response plans when available
  const allowedCards = useMemo(() => {
    const planIdsFromResponse: number[] = (() => {
      const prov = (verificationData as any)?.provider_response
      const providerPlans = prov?.providerData?.plans || (prov?.fullResponse?.plans) || (verificationData as any)?.providerData?.plans || (verificationData as any)?.plans
      if (Array.isArray(providerPlans) && providerPlans.length > 0) {
        return providerPlans.map((p: any) => Number(p.id)).filter((n: any) => !Number.isNaN(n))
      }
      const drop = prov?.providerData?.dropzone_plans || prov?.dropzone_plans || (verificationData as any)?.dropzone_plans
      if (typeof drop === 'string') {
        try {
          const arr = JSON.parse(drop)
          if (Array.isArray(arr)) return arr.map((x) => Number(x))
        } catch {
          // ignore invalid JSON in dropzone_plans
          console.log('Not importing dropzone_plans');
        }
      }
      return []
    })()

    // Use template plans if no plans from backend response, or if explicitly forcing template-based cards
    const templatePlans = TEMPLATES.find(t => t.id === selectedTemplateId)?.dropzone_plans || []
    const planIds = planIdsFromResponse.length > 0 && planIdsFromResponse.some(p => PLAN_ID_TO_CARDS[p]?.length > 0)
      ? planIdsFromResponse
      : templatePlans

    // Debug logging
    if (planIds.length === 0 && templatePlans.length > 0) {
      console.log('[ValidationPage] No cards found for template:', selectedTemplateId, 'plans:', templatePlans)
    }

    const cards = planIds.flatMap((pid) => PLAN_ID_TO_CARDS[pid] || [])
    console.log('[ValidationPage] Allowed cards:', Array.from(cards), 'from planIds:', planIds, 'templateId:', selectedTemplateId)
    return new Set(cards)
  }, [verificationData, selectedTemplateId])

  const showPhilsys = allowedCards.has('philsys_liveness')
  const showDocument = allowedCards.has('document_verification')
  const showBiometricsVerification = allowedCards.has('biometrics_verification')
  const showBiometricsFaceCompare = allowedCards.has('biometrics_face_compare')
  const showCustomDocument = allowedCards.has('custom_document')
  const showPhLto = allowedCards.has('ph_lto_drivers_license')
  const showPhPrc = allowedCards.has('ph_prc')
  const showPhNationalPolice = allowedCards.has('ph_national_police')
  const showPhNbi = allowedCards.has('ph_nbi')
  const showPhSss = allowedCards.has('ph_sss')

  // Template name for display
  const templateName = useMemo(() => {
    const prov = (verificationData as any)?.provider_response
    const name = prov?.providerData?.template?.name || prov?.fullResponse?.template?.name
    if (typeof name === 'string' && name.trim()) return name
    const tpl = TEMPLATES.find(t => t.id === selectedTemplateId)
    return tpl?.name || 'N/A'
  }, [verificationData, selectedTemplateId])

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!verificationId) return

    // Ensure WebSocket is connected
    if (!websocketService.isConnected()) {
      websocketService.connect()
    }

    let unsubscribe: (() => void) | null = null
    let unsubscribeExternal: (() => void) | null = null

    // Wait a bit for connection to establish if needed
    const subscribeTimeout = setTimeout(() => {
      // Subscribe to internal verification ID
      unsubscribe = websocketService.subscribeToVerification(verificationId, (data) => {
        // Handle nested data structure from WebSocket events
        const wsData = (data as any).data || data
        const status = wsData?.status || (data as any).status || (data as any).verificationStatus || ''
        const result = wsData?.result || (data as any).result || (data as any).verificationResult
        
        if (status) {
          setVerificationStatus(status)
          
          // Update verification state with WebSocket data
          setVerification((prev) => {
            const updated = {
              ...prev,
              id: verificationId,
              status: status,
              externalVerificationId: wsData?.externalVerificationId || wsData?.external_verification_id || (data as any).externalVerificationId || (data as any).external_verification_id || verificationData?.externalVerificationId || verificationData?.external_verification_id || prev?.externalVerificationId || prev?.external_verification_id,
              verificationType: wsData?.verificationType || (data as any).verificationType || verificationData?.verificationType || prev?.verificationType || 'document',
              createdAt: wsData?.createdAt || wsData?.created_at || (data as any).createdAt || (data as any).created_at || verificationData?.createdAt || verificationData?.created_at || prev?.createdAt || new Date().toISOString(),
              updatedAt: wsData?.updatedAt || wsData?.updated_at || (data as any).updatedAt || (data as any).updated_at || verificationData?.updatedAt || verificationData?.updated_at || new Date().toISOString(),
              result: result || verificationData?.result || prev?.result,
              userEmail: verificationData?.userEmail || prev?.userEmail || '',
              userPhone: verificationData?.userPhone || prev?.userPhone || null,
              provider: verificationData?.provider || prev?.provider || null,
            } as Verification
            return updated
          })
          
          // Refetch verification data to ensure UI is in sync
          if (refetchVerification) {
            refetchVerification()
          }
        }
      })

      // Also subscribe to external verification ID if available
      const externalId = 
        apiResponse?.external_verification_id ||
        verification?.external_verification_id ||
        verificationData?.external_verification_id

      if (externalId && externalId !== verificationId) {
        unsubscribeExternal = websocketService.subscribeToVerification(externalId, (data) => {
          // Handle nested data structure from WebSocket events
          const wsData = (data as any).data || data
          const status = wsData?.status || (data as any).status || (data as any).verificationStatus || ''
          const result = wsData?.result || (data as any).result || (data as any).verificationResult
          
          if (status) {
            setVerificationStatus(status)
            
            // Update verification state with WebSocket data
            setVerification((prev) => {
              const updated = {
                ...prev,
                id: verificationId,
                status: status,
                externalVerificationId: wsData?.externalVerificationId || wsData?.external_verification_id || externalId,
                verificationType: wsData?.verificationType || (data as any).verificationType || prev?.verificationType || 'document',
                createdAt: wsData?.createdAt || wsData?.created_at || (data as any).createdAt || (data as any).created_at || prev?.createdAt || new Date().toISOString(),
                updatedAt: wsData?.updatedAt || wsData?.updated_at || (data as any).updatedAt || (data as any).updated_at || new Date().toISOString(),
                result: result || prev?.result,
                userEmail: prev?.userEmail || '',
                userPhone: prev?.userPhone || null,
                provider: prev?.provider || null,
              } as Verification
              return updated
            })
            
            // Refetch verification data to ensure UI is in sync
            if (refetchVerification) {
              refetchVerification()
            }
          }
        })
      }
    }, 100)

    return () => {
      clearTimeout(subscribeTimeout)
      if (unsubscribe) {
        unsubscribe()
      }
      if (unsubscribeExternal) {
        unsubscribeExternal()
    }
    }
  }, [verificationId, apiResponse, verificationData, verification, refetchVerification])

  // Update verification state when data is loaded
  useEffect(() => {
    if (verificationData && !verification) {
      setVerification(verificationData)
      setVerificationStatus(verificationData.status)
    }
  }, [verificationData, verification])

  // Derive templateId from backend response when available
  useEffect(() => {
    if (!verificationId) return
    const prov = (verificationData as any)?.provider_response
    const tplFromProv = prov?.providerData?.template?.id || prov?.fullResponse?.template?.id
    const tplFromVerification = (verificationData as any)?.verification?.template_id || (verificationData as any)?.template_id
    const derived = Number(tplFromProv || tplFromVerification)
    if (!Number.isNaN(derived) && derived) {
      setSelectedTemplateId(derived)
      localStorage.setItem(`selected_template_${verificationId}`, String(derived))
    }
  }, [verificationData, verificationId])

  // If initiated without external_verification_id, attempt to fetch it shortly after mount
  useEffect(() => {
    if (!verificationId) return
    const missingExternal = !(
      apiResponse?.external_verification_id ||
      verification?.external_verification_id ||
      verificationData?.external_verification_id
    )
    if (missingExternal && refetchVerification) {
      const t = setTimeout(() => {
        refetchVerification()
      }, 400)
      return () => clearTimeout(t)
    }
  }, [verificationId, apiResponse, verification, verificationData, refetchVerification])

  // Load last persisted PhilSys submission (for this verification)
  useEffect(() => {
    if (!verificationId) return
    try {
      const raw = localStorage.getItem(`philsys_pcn_${verificationId}`)
      if (raw) {
        setLastPhilsysSubmission(JSON.parse(raw))
      }
    } catch {
      // Ignore errors when parsing localStorage data
    }
  }, [verificationId])

  // Check if SDK is loaded
  useEffect(() => {
    const checkSDKLoaded = () => {
      if (window.IDmetaPhilsysLiveness) {
        setSDKLoaded(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkSDKLoaded()) {
      return
    }

    // Check periodically for up to 10 seconds
    const interval = setInterval(() => {
      if (checkSDKLoaded()) {
        clearInterval(interval)
      }
    }, 500)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!window.IDmetaPhilsysLiveness) {
        setSDKLoadFailed(true)
      }
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  // Request camera permission on page load
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return
        }
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Immediately stop the stream - we just wanted to request permission
        stream.getTracks().forEach(track => track.stop())
      } catch (error) {
        // Permission denied or camera not available - this is okay, user can grant it later
        console.warn('Camera permission not granted on page load:', error)
      }
    }

    requestCameraPermission()
  }, [])


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const handlePhilsysLivenessCheck = () => {
    // Prevent multiple simultaneous starts (which can cause instant close)
    const runningRef = (handlePhilsysLivenessCheck as any)._runningRef || ((handlePhilsysLivenessCheck as any)._runningRef = { current: false })
    if (runningRef.current) return
    runningRef.current = true
    // Block if we detect an external_verification_id mismatch
    if (externalIdMismatch) {
      setPhilsysError('External verification ID mismatch detected. Please refresh and ensure you use the verification opened on this page.')
      runningRef.current = false
      return
    }
      // Check if SDK is loaded
      if (!window.IDmetaPhilsysLiveness) {
      setPhilsysError('IDmeta Philsys Liveness SDK not loaded. Please refresh the page.')
      runningRef.current = false
      return
    }

    // Get API key from environment
    const API_KEY = import.meta.env.VITE_IDMETA_API_KEY
    if (!API_KEY) {
      setPhilsysError('IDmeta API key not configured. Please check your environment variables.')
      runningRef.current = false
      return
    }
    
    // Use external_verification_id strictly from fetched verification to avoid mismatches
    const externalVerificationId = verificationData?.external_verification_id
      
    if (!externalVerificationId) {
      setPhilsysError('No external_verification_id returned from backend.')
      setIsPhilsysTesting(false)
      runningRef.current = false
      return
    }
      
    // Helper: forcefully stop all active camera tracks
    const stopAllCameraTracks = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDev = devices.filter(d => d.kind === 'videoinput')
        if (videoDev.length > 0 && navigator.mediaDevices?.getUserMedia) {
          // Attempt to get and immediately stop a stream to release any lingering locks
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(track => {
              track.stop()
              console.log('Stopped camera track:', track.id)
            })
          } catch { void 0 }
        }
      } catch { void 0 }
    }

    // Helper: reload the SDK script and wait until it re-attaches to window
    const reloadIdmetaSDK = async (): Promise<void> => {
      try {
        const sdkSrc = 'https://web-sdk.idmetagroup.com/js/idmeta-philsys-sdk.min.js'
        const scripts = Array.from(document.getElementsByTagName('script'))
        const existing = scripts.find(s => (s.getAttribute('src') || '').includes('idmeta-philsys-sdk.min.js'))
        if (existing && existing.parentElement) {
          existing.parentElement.removeChild(existing)
        }
        await new Promise<void>((resolve, reject) => {
          const el = document.createElement('script')
          el.src = sdkSrc
          el.async = true
          el.onload = () => resolve()
          el.onerror = () => reject(new Error('Failed to reload IDmeta SDK'))
          document.head.appendChild(el)
        })
        // Wait for global attach
        const start = Date.now()
        while (!window.IDmetaPhilsysLiveness && Date.now() - start < 5000) {
          await new Promise(r => setTimeout(r, 100))
        }
      } catch {
        // swallow, caller will surface a friendly error
      }
    }

    // Preflight: attempt camera access and immediately release to avoid stale lock between runs
    // This also surfaces permission errors before invoking the SDK
    const preflight = async () => {
      // First, stop any lingering tracks from previous run
      await stopAllCameraTracks()
      
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const s = await navigator.mediaDevices.getUserMedia({ video: true })
          s.getTracks().forEach(t => t.stop())
        }
      } catch (e: any) {
        const errName = e?.name || ''
        if (errName === 'NotAllowedError') {
          setPhilsysError('Camera permission denied. Please allow camera access and try again.')
        } else if (errName === 'NotFoundError') {
          setPhilsysError('No camera device found.')
        } else if (errName === 'NotReadableError') {
          setPhilsysError('Camera is in use by another application. Close it and try again.')
        } else if (errName === 'OverconstrainedError') {
          setPhilsysError('Camera constraints cannot be satisfied by any available device.')
        } else if (errName === 'SecurityError') {
          setPhilsysError('Camera blocked due to insecure context. Use HTTPS or localhost.')
        } else {
          setPhilsysError(e?.message || 'Unable to access camera.')
        }
        runningRef.current = false
        throw e
      }
    }

    // Kick off SDK after preflight completes
    const startSDK = async () => {
      const sdkInstance = window.IDmetaPhilsysLiveness!()
    
      // Verify .start() method exists
      if (typeof sdkInstance?.start !== 'function') {
        setPhilsysError('SDK start method not found.')
        setIsPhilsysTesting(false)
        runningRef.current = false
        return
      }
      
      // Sanitize parameters and call SDK with external verification ID
      const verificationIdForSDK = String(externalVerificationId).trim()
      const tokenForSDK = String(API_KEY).trim()
      if (!verificationIdForSDK || !tokenForSDK) {
        setPhilsysError('Invalid SDK parameters. Missing verificationId or token.')
        runningRef.current = false
        return
      }
      const sdkPromise = sdkInstance.start({
        verificationId: verificationIdForSDK,
        token: tokenForSDK,
      })
      
      // Set loading state after initiating SDK to preserve user gesture timing
      setIsPhilsysTesting(true)
      setPhilsysError(null)
      setPhilsysResponse(null)
      
      setShowSDKWarning(true)
      
      let didRetry = false
      const tryReloadAndRetry = async (reason?: string) => {
        if (didRetry) return
        didRetry = true
        // Best-effort stop any tracks
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            const s = await navigator.mediaDevices.getUserMedia({ video: true })
            s.getTracks().forEach(t => t.stop())
          }
        } catch { void 0 }
        await reloadIdmetaSDK()
        if (!window.IDmetaPhilsysLiveness) {
          setPhilsysError(reason || 'Unable to initialize camera. Please refresh the page.')
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
          return
        }
        // Retry once
        const retryInstance = window.IDmetaPhilsysLiveness()
        if (typeof retryInstance?.start !== 'function') {
          setPhilsysError('SDK start method not found after reload.')
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
          return
        }
        const retryPromise = retryInstance.start({
          verificationId: verificationIdForSDK,
          token: tokenForSDK,
        })
        retryPromise.then((data) => {
          if (data?.status === 'error' || data?.result?.error) {
            const sdkMsg = data?.result?.message || data?.message || 'Face liveness failed'
            setPhilsysResponse(data)
            setPhilsysError(sdkMsg)
            setIsPhilsysTesting(false)
            setShowSDKWarning(false)
            return
          }
          const sessionId = data?.result?.session_id
          if (!sessionId) {
            const errorMsg = data?.result?.message || data?.message || 'Face liveness session ID not returned.'
            setPhilsysResponse(data)
            setPhilsysError(errorMsg)
            setIsPhilsysTesting(false)
            setShowSDKWarning(false)
            return
          }
          setPhilsysResponse(data)
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
        }).catch((error: any) => {
          let errorMsg = error?.message || 'Face liveness check failed'
          const errName = (error as any)?.name || ''
          if (errorMsg.includes('parse') || errorMsg.includes('JSON') || errorMsg.includes('Unable to parse')) {
            errorMsg = 'Face liveness session may have exited unexpectedly. Please try again.'
          } else if (errName === 'NotAllowedError') {
            errorMsg = 'Camera permission denied. Please allow camera access and try again.'
          } else if (errName === 'NotFoundError') {
            errorMsg = 'No camera device found.'
          } else if (errName === 'SecurityError') {
            errorMsg = 'Camera blocked due to insecure context. Use HTTPS or localhost.'
          } else if (errName === 'NotReadableError') {
            errorMsg = 'Camera is in use by another application. Close it and try again.'
          } else if (errorMsg.includes('exited') || errorMsg.includes('session')) {
            errorMsg = `Face liveness session ended: ${errorMsg}`
          }
          setPhilsysError(errorMsg)
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
        })
        .finally(async () => {
          // Always stop camera tracks when retry completes
          await stopAllCameraTracks()
          runningRef.current = false
        })
      }

      // Handle the SDK promise
      sdkPromise.then((data) => {
        // Prefer provider message if present
        if (data?.status === 'error' || data?.result?.error) {
          const sdkMsg = data?.result?.message || data?.message || 'Face liveness failed'
          setPhilsysResponse(data)
          setPhilsysError(sdkMsg)
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
          return
        }

        const sessionId = data?.result?.session_id
        if (!sessionId) {
          const errorMsg = data?.result?.message || data?.message || 'Face liveness session ID not returned.'
          setPhilsysResponse(data)
          setPhilsysError(errorMsg)
          setIsPhilsysTesting(false)
          setShowSDKWarning(false)
          return
        }

        setPhilsysResponse(data)
        setIsPhilsysTesting(false)
        setShowSDKWarning(false)
      }).catch((error: any) => {
        console.error('SDK execution error:', error)
        
        let errorMsg = error?.message || 'Face liveness check failed'
        const errName = (error as any)?.name || ''
        
        // Check for parsing errors in error message
        if (errorMsg.includes('parse') || errorMsg.includes('JSON') || errorMsg.includes('Unable to parse')) {
          errorMsg = 'Face liveness session may have exited unexpectedly. Please try again.'
        } else if (errName === 'NotAllowedError') {
          errorMsg = 'Camera permission denied. Please allow camera access and try again.'
        } else if (errName === 'NotFoundError') {
          errorMsg = 'No camera device found.'
        } else if (errName === 'SecurityError') {
          errorMsg = 'Camera blocked due to insecure context. Use HTTPS or localhost.'
        } else if (errName === 'NotReadableError') {
          // Retry once with a full SDK reload which can clear previous camera handles
          tryReloadAndRetry('Camera is in use by another application. Close it and try again.')
          return
        } else if (errorMsg.includes('exited') || errorMsg.includes('session')) {
          errorMsg = `Face liveness session ended: ${errorMsg}`
        }
        
        setPhilsysError(errorMsg)
        setIsPhilsysTesting(false)
        setShowSDKWarning(false)
      }).finally(async () => {
        // Always stop camera tracks when SDK completes (success, error, or cancel)
        await stopAllCameraTracks()
        runningRef.current = false
      })
    }

    preflight().then(startSDK).catch(() => {
      // preflight already set error and reset flag
    })
  }

  // Submit to PH PhilSys (PCN)
  const handleSubmitPhilsysPCN = async () => {
    if (!philsysResponse?.result?.session_id) {
      setPhilsysError('Face liveness session is required. Please complete liveness first.')
      return
    }
    if (!pcn || pcn.replace(/[^0-9]/g, '').length !== 16) {
      setPhilsysError('Please enter a valid PCN (16 digits).')
      return
    }
    if (!verificationId) {
      setPhilsysError('Missing verificationId.')
      return
    }

    setIsSubmittingPhilsys(true)
    setPhilsysError(null)
    try {
      // Remove dashes from PCN before submitting (submit only digits)
      const pcnDigits = pcn.replace(/[^0-9]/g, '')
      const payload = {
        pcn: pcnDigits,
        faceLivenessSessionId: philsysResponse.result.session_id as string,
        templateId: String(selectedTemplateId),
        verificationId: verificationId as string,
      }
      const resp = await apiClient.post<{ id: string; status: string }>(API_ENDPOINTS.PH_PHILSYS_PCN, payload)
      if (resp?.status) {
        setVerificationStatus(resp.status)
        setVerification((prev) => prev ? { ...prev, status: resp.status } as Verification : prev)
      }
      // Persist last submission
      const record = {
        pcn,
        faceLivenessSessionId: payload.faceLivenessSessionId,
        status: resp?.status || 'processing',
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem(`philsys_pcn_${verificationId}`, JSON.stringify(record))
      setLastPhilsysSubmission(record)
      // Sync with server
      if (refetchVerification) {
        await refetchVerification()
      }
    } catch (e: any) {
      if (e?.statusCode === 400 && typeof e?.message === 'string' && e.message.toLowerCase().includes('initiate')) {
        setPhilsysError('Please initiate a session first via face liveness and use the external_verification_id from IDMeta.')
      } else {
        setPhilsysError(e?.message || 'Failed to submit to PhilSys.')
      }
    } finally {
      setIsSubmittingPhilsys(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    const normalizedStatus = status.toLowerCase()
    
    if (normalizedStatus.includes('approved') || normalizedStatus === 'approved') {
      return <Badge variant={status as any}>Approved</Badge>
    }
    if (normalizedStatus.includes('rejected') || normalizedStatus === 'rejected') {
      return <Badge variant={status as any}>Rejected</Badge>
    }
    if (normalizedStatus.includes('pending') || normalizedStatus === 'pending') {
      return <Badge variant={status as any}>Pending</Badge>
    }
    if (normalizedStatus.includes('processing') || normalizedStatus === 'processing') {
      return <Badge variant={status as any}>Processing</Badge>
    }
    return <Badge>{status}</Badge>
  }

  if (isLoadingVerification) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!apiResponse && !verificationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No verification data available</p>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/tenant/verifications')}
            className="mt-4"
          >
            Back to Verifications
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Verification Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Verification ID: {verificationId}
            </p>
          </div>
        </div>
        
        {/* WebSocket Status Indicator */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  websocketService.isConnected() ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-600 dark:text-gray-400">
                WebSocket: {websocketService.isConnected() ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {verificationStatus && (
              <span className="text-gray-500 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600 pl-3">
                Last Update: <span className="text-gray-600 dark:text-gray-400">{verificationStatus}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* API Response */}
      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Initialize Verification API Response</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2))}
                icon={<Copy className="h-4 w-4" />}
              >
                Copy JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Internal Verification ID
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {apiResponse.verificationId || apiResponse.verification_id || 'N/A'}
                    </p>
                  {(apiResponse.verificationId || apiResponse.verification_id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(apiResponse.verificationId || apiResponse.verification_id || '')
                      }
                      icon={<Copy className="h-3 w-3" />}
                    >{''}</Button>
                  )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    External Verification ID (IDmeta)
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {apiResponse.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id || 'N/A'}
                    </p>
                  {(apiResponse.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(apiResponse.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id || '')
                      }
                      icon={<Copy className="h-3 w-3" />}
                    >{''}</Button>
                  )}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Used for all verification endpoints
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  {getStatusBadge(verification?.status || apiResponse.status)}
                </div>
                {apiResponse.sessionUrl || apiResponse.session_url ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Session URL
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all flex-1">
                        {apiResponse.sessionUrl || apiResponse.session_url}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          window.open(apiResponse.sessionUrl || apiResponse.session_url, '_blank')
                        }
                      >
                        Open Session
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(apiResponse.sessionUrl || apiResponse.session_url || '')
                        }
                        icon={<Copy className="h-3 w-3" />}
                      >{''}</Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Full JSON Response */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Full Response JSON
                </label>
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs font-mono">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Verification Status */}
      {verification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Verification Status</span>
              {(verification as any)?.metadata?.request_type === 'philsys_pcn' && (
                <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  PH PhilSys PCN
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                {getStatusBadge(verification.status)}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Verification Type
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {templateName}
                </p>
              </div>
              {(verification.external_verification_id || verificationData?.external_verification_id) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    External Verification ID (IDmeta)
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {verification.external_verification_id || verificationData?.external_verification_id}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(verification.external_verification_id || verificationData?.external_verification_id || '')
                      }
                      icon={<Copy className="h-3 w-3" />}
                    >{''}</Button>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Used for all verification endpoints
                  </p>
                </div>
              )}
              {/* Flow metadata */}
              {(verification as any)?.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Flow
                  </label>
                  <div className="text-sm text-gray-900 dark:text-gray-100 space-x-2">
                    {(verification as any)?.metadata?.country && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                        {(verification as any).metadata.country}
                      </span>
                    )}
                    {(verification as any)?.metadata?.flow && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                        {(verification as any).metadata.flow}
                      </span>
                    )}
                    {(verification as any)?.metadata?.input_type && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                        {(verification as any).metadata.input_type}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {verification.createdAt || verification.created_at ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(verification.createdAt || verification.created_at)}
                  </p>
                </div>
              ) : null}
              {verification.updatedAt || verification.updated_at ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(verification.updatedAt || verification.updated_at)}
                  </p>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Verification Steps
                </label>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-x-2">
                  {Array.from(allowedCards).map((c) => (
                    <span key={c} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">{c}</span>
                  ))}
                  {allowedCards.size === 0 && (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Result (if available) */}
            {verification.result && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Verification Result
                </label>
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs font-mono">
                  {JSON.stringify(verification.result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Included Steps moved into Current Verification Status */}

      {/* Philsys Face Liveness Test */}
      {showPhilsys && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>PH Philsys - Face Liveness Check</span>
            {philsysResponse && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(philsysResponse, null, 2))}
                icon={<Copy className="h-4 w-4" />}
              >
                Copy Response
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
            {/* SDK Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  sdkLoaded ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span className="text-gray-600 dark:text-gray-400">
                SDK Status: {sdkLoaded ? 'Loaded' : 'Loading...'}
              </span>
            </div>

            {/* QR Code Verification intentionally removed */}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Face Liveness Check:</strong> Uses the IDmeta Web SDK for face verification.
              </p>
              {(apiResponse?.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  <strong>External Verification ID:</strong> <code>{apiResponse?.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id}</code>
                </p>
              )}
              {externalIdMismatch && (
                <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ Detected mismatching external_verification_id between the initiated response and the fetched verification. The SDK will be blocked to prevent invalid sessions.
                  </p>
                </div>
              )}
            </div>

            {!verificationData?.external_verification_id && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ <strong>Missing External Verification ID</strong>
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  The backend did not return <code>external_verification_id</code> in fetched verification data. Face liveness check is disabled until details load.
                </p>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handlePhilsysLivenessCheck}
              disabled={
                isPhilsysTesting || 
                !sdkLoaded || 
                !verificationData?.external_verification_id ||
                externalIdMismatch
              }
              icon={<Eye className="h-4 w-4" />}
            >
              {isPhilsysTesting ? 'Processing Face Liveness...' : 'Start Face Liveness Check'}
            </Button>

            {showSDKWarning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold mb-2">
                  📹 Camera Interface Active - Waiting for Face Scan
                </p>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-2">
                  <p className="font-medium">✅ SDK is running. Complete the face scan in the camera window.</p>
                  <p className="mt-2">
                    <strong>Request Status:</strong> Connecting to <code>ws.everify.gov.ph</code>
                  </p>
                  <p className="font-medium mt-3 text-orange-600 dark:text-orange-400">⚠️ If the window closed immediately:</p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li><strong>Camera Permission:</strong> Click "Allow" when browser asks for camera access</li>
                    <li><strong>Popup Blocker:</strong> Look for 🚫 icon in address bar and click to allow popups</li>
                    <li><strong>HTTPS:</strong> Camera only works on secure (https://) connections</li>
                    <li><strong>Browser:</strong> Try Chrome or Edge if using another browser</li>
                    <li><strong>Network:</strong> Check DevTools (F12) → Network tab for failed requests</li>
                    <li><strong>Console Errors:</strong> Check DevTools (F12) → Console tab for error messages</li>
                  </ol>
                  <div className="mt-3 bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded space-y-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">💡 Troubleshooting Tips:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                      <li>The SDK may open in a popup window - check if it's behind this window</li>
                      <li>Some ad blockers can interfere - try disabling them temporarily</li>
                      <li>If using incognito/private mode, camera may be blocked by default</li>
                      <li>The request to <code>ws.everify.gov.ph</code> should show "pending" until scan completes</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {!sdkLoaded && !sdkLoadFailed && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⏳ Waiting for SDK to load... If this persists, check browser console for errors.
                </p>
              </div>
            )}

            {sdkLoadFailed && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2">
                  ❌ SDK Failed to Load
                </p>
                <div className="text-xs text-red-600 dark:text-red-400 space-y-2">
                  <p>The IDmeta Philsys Liveness SDK could not be loaded. Please check:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open <strong>DevTools → Network tab</strong> and look for the SDK request</li>
                    <li>Check for <strong>404 (Not Found)</strong> or <strong>CORS errors</strong></li>
                    <li>Verify network connectivity</li>
                    <li>Test the SDK URL directly in your browser:</li>
                  </ol>
                  <div className="bg-white dark:bg-gray-900 p-2 rounded mt-2 font-mono text-xs break-all">
                    https://web-sdk.idmetagroup.com/js/idmeta-philsys-sdk.min.js
                  </div>
                </div>
              </div>
            )}

            {philsysError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {philsysError}
                </p>
              </div>
            )}

            {philsysResponse && (
              <div className="space-y-4">
                {(philsysResponse.result?.error || !philsysResponse.result?.session_id) ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                      ❌ Face Liveness Failed
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {philsysResponse.result?.message || 'The SDK did not return a session ID.'}
                    </p>
                    <ul className="mt-3 list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                      <li>Ensure you are using a valid <code>externalVerificationId</code> from IDmeta.</li>
                      <li>Confirm the SDK token is correct and not expired.</li>
                      <li>Retry and allow camera permissions; close other apps using the camera.</li>
                    </ul>
                  </div>
                ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">
                    ✅ Face Liveness Check Completed Successfully!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    The face biometric data has been captured. Session ID is ready for backend integration.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Status
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {philsysResponse.status || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Session ID
                      </label>
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                        {philsysResponse.result?.session_id || 'N/A'}
                      </p>
                    </div>
                    {philsysResponse.result?.photo && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Captured Photo
                        </label>
                        <img 
                          src={philsysResponse.result.photo} 
                          alt="Face liveness capture" 
                          className="w-48 h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    )}
                    {philsysResponse.result?.photo_url && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Photo URL
                        </label>
                        <a 
                          href={philsysResponse.result.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {philsysResponse.result.photo_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Full SDK Response (Console Logged)
                  </label>
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs font-mono max-h-96">
                    {JSON.stringify(philsysResponse, null, 2)}
                  </pre>
                </div>

              {/* Submit to PH PhilSys (PCN) */}
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Submit to PH PhilSys (PCN)
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234-5678-9123-4567"
                    value={pcn}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 16)
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1-').replace(/-$/,'')
                      setPcn(formatted)
                    }}
                    className="w-full sm:w-64 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    variant="primary"
                    onClick={handleSubmitPhilsysPCN}
                    disabled={
                      isSubmittingPhilsys ||
                      !philsysResponse?.result?.session_id ||
                      pcn.replace(/[^0-9]/g, '').length !== 16
                    }
                  >
                    {isSubmittingPhilsys ? 'Submitting…' : 'Submit to PhilSys'}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Requires face liveness session and a valid 16-digit PCN.
                </p>
                </div>

                {/* Backend API Payload Information */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    📤 Next Step: Send to Backend API
                  </p>
                  <div className="space-y-3 text-xs">
                    <p className="text-blue-700 dark:text-blue-300">
                      Now that you have the <strong>face_liveness_session_id</strong>, send it to your backend for final PhilSys verification:
                    </p>
                    <div>
                      <label className="block font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Endpoint:
                      </label>
                      <code className="block bg-white dark:bg-gray-900 p-2 rounded text-blue-600 dark:text-blue-400 break-all">
                        POST https://integrate.idmetagroup.com/api/v1/verification/philippines/philsys
                      </code>
                    </div>
                    <div>
                      <label className="block font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Required Payload:
                      </label>
                      <pre className="bg-white dark:bg-gray-900 p-2 rounded text-blue-600 dark:text-blue-400 overflow-auto">
{`{
  "pcn": "6213-4810-9650-3712",
  "face_liveness_session_id": "${philsysResponse.result?.session_id || 'N/A'}",
  "template_id": "425",
  "verification_id": "${apiResponse?.external_verification_id || verification?.external_verification_id || verificationData?.external_verification_id || 'N/A'}"
}`}
                      </pre>
                    </div>
                    <div>
                      <label className="block font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Headers:
                      </label>
                      <code className="block bg-white dark:bg-gray-900 p-2 rounded text-blue-600 dark:text-blue-400 text-xs">
                        Authorization: Bearer 137|abdOo8iQkOpnRdl8SH78RN3MVQtsTgIYUQWx0YZK4a3dd679
                      </code>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded mt-2">
                      <p className="text-blue-800 dark:text-blue-200 font-medium">
                        💡 Key Points:
                      </p>
                      <ul className="list-disc list-inside mt-1 text-blue-700 dark:text-blue-300 space-y-1">
                        <li>The <code>face_liveness_session_id</code> proves live face capture</li>
                        <li>Backend will validate against PhilSys database</li>
                        <li>Replace PCN and template_id with actual values</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Side panel: Last PhilSys Submission (persisted) */}
            <div className="space-y-4">
              {lastPhilsysSubmission && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Last PhilSys PCN Submission</p>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="font-medium">PCN:</span> <span className="font-mono">{lastPhilsysSubmission.pcn}</span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {getStatusBadge(lastPhilsysSubmission.status)}
                    </div>
                    <div>
                      <span className="font-medium">Face Liveness Session:</span> <span className="font-mono break-all">{lastPhilsysSubmission.faceLivenessSessionId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Submitted At:</span> {formatDate(lastPhilsysSubmission.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Biometrics Verification */}
      {showBiometricsVerification && (
      <Card>
        <CardHeader>
          <CardTitle>Biometrics Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Biometric Verification Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Biometric Verification</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Face Image (JPG/PNG, ≤10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const err = validateImageFile(file)
                    if (err) {
                      setBiometricError(err)
                      return
                    }
                    const dataUrl = await fileToDataUrl(file)
                    setBiometricVerificationImageUrl(dataUrl)
                    setBiometricError(null)
                  }}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {biometricVerificationImageUrl && (
                  <img src={biometricVerificationImageUrl} alt="Biometric preview" className="mt-2 h-32 rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleBiometricVerification}
                disabled={isSubmittingBiometric || !biometricVerificationImageUrl}
              >
                {isSubmittingBiometric ? 'Verifying...' : 'Verify Biometrics'}
              </Button>
              {biometricVerificationResponse && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(biometricVerificationResponse.status)}</p>
                  <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{biometricVerificationResponse.id}</span></p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Biometric Registration Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Biometric Registration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={biometricUsername}
                  onChange={(e) => setBiometricUsername(e.target.value)}
                  placeholder="e.g., john.doe@example.com or John Doe"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Face Image (JPG/PNG, ≤10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const err = validateImageFile(file)
                    if (err) {
                      setBiometricError(err)
                      return
                    }
                    const dataUrl = await fileToDataUrl(file)
                    setBiometricRegistrationImageUrl(dataUrl)
                    setBiometricError(null)
                  }}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {biometricRegistrationImageUrl && (
                  <img src={biometricRegistrationImageUrl} alt="Registration preview" className="mt-2 h-32 rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleBiometricRegistration}
                disabled={isSubmittingBiometric || !biometricRegistrationImageUrl || !biometricUsername.trim()}
              >
                {isSubmittingBiometric ? 'Registering...' : 'Register Biometrics'}
              </Button>
              {biometricRegistrationResponse && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(biometricRegistrationResponse.status)}</p>
                  <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{biometricRegistrationResponse.id}</span></p>
                </div>
              )}
            </div>

            {biometricError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {biometricError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Biometrics Face Compare / Face Match */}
      {showBiometricsFaceCompare && (
      <Card>
        <CardHeader>
          <CardTitle>Biometrics Face Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare two facial images to determine if they match (for identity verification).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image 1 (JPG/PNG, ≤10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const err = validateImageFile(file)
                    if (err) {
                      setFaceMatchError(err)
                      return
                    }
                    const dataUrl = await fileToDataUrl(file)
                    setFaceMatchImage1Url(dataUrl)
                    setFaceMatchError(null)
                  }}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {faceMatchImage1Url && (
                  <img src={faceMatchImage1Url} alt="Image 1 preview" className="mt-2 h-32 w-full rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image 2 (JPG/PNG, ≤10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const err = validateImageFile(file)
                    if (err) {
                      setFaceMatchError(err)
                      return
                    }
                    const dataUrl = await fileToDataUrl(file)
                    setFaceMatchImage2Url(dataUrl)
                    setFaceMatchError(null)
                  }}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {faceMatchImage2Url && (
                  <img src={faceMatchImage2Url} alt="Image 2 preview" className="mt-2 h-32 w-full rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleFaceMatch}
              disabled={isSubmittingFaceMatch || !faceMatchImage1Url || !faceMatchImage2Url}
            >
              {isSubmittingFaceMatch ? 'Comparing...' : 'Compare Faces'}
            </Button>
            {faceMatchResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(faceMatchResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{faceMatchResponse.id}</span></p>
                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  {faceMatchResponse.status === 'approved' ? '✅ Images match (similarity score ≥ 70)' : '❌ Images do not match (similarity score < 70)'}
                </p>
              </div>
            )}
            {faceMatchError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {faceMatchError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Custom Document Verification */}
      {showCustomDocument && (
      <Card>
        <CardHeader>
        <CardTitle>Custom Document Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload a custom document (invoices, certificates, forms) and extract structured data.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document (PNG/JPEG/PDF, ≤10MB) - Optional
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > MAX_IMAGE_BYTES) {
                    setCustomDocError('File is too large. Max size is ~10MB.')
                    return
                  }
                  const dataUrl = await fileToDataUrl(file)
                  setCustomDocImageUrl(dataUrl)
                  setCustomDocError(null)
                }}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              />
              {customDocImageUrl && customDocImageUrl.startsWith('data:image') && (
                <img src={customDocImageUrl} alt="Document preview" className="mt-2 h-32 rounded border border-gray-200 dark:border-gray-700 object-cover" />
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleCustomDocument}
              disabled={isSubmittingCustomDoc}
            >
              {isSubmittingCustomDoc ? 'Processing...' : 'Submit Custom Document'}
            </Button>
            {customDocResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(customDocResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{customDocResponse.id}</span></p>
              </div>
            )}
            {customDocError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {customDocError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* PH Government Data Verification Cards */}
      {showPhLto && (
      <Card>
        <CardHeader>
          <CardTitle>PH LTO Drivers License Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                License Number
              </label>
              <input
                type="text"
                value={phLtoLicenseNo}
                onChange={(e) => setPhLtoLicenseNo(e.target.value)}
                placeholder="e.g., N01-12-345678"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="primary"
              onClick={handlePhLto}
              disabled={isSubmittingPhLto || !phLtoLicenseNo.trim()}
            >
              {isSubmittingPhLto ? 'Verifying...' : 'Verify LTO License'}
            </Button>
            {phLtoResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(phLtoResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{phLtoResponse.id}</span></p>
              </div>
            )}
            {phLtoError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {phLtoError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {showPhPrc && (
      <Card>
        <CardHeader>
          <CardTitle>PH PRC License Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profession
              </label>
              <input
                type="text"
                value={phPrcProfession}
                onChange={(e) => setPhPrcProfession(e.target.value)}
                placeholder="e.g., Engineer, Doctor, Nurse"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search By
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="prcSearchBy"
                    value="license"
                    checked={phPrcSearchBy === 'license'}
                    onChange={() => setPhPrcSearchBy('license')}
                    className="mr-2"
                  />
                  License Number
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="prcSearchBy"
                    value="name"
                    checked={phPrcSearchBy === 'name'}
                    onChange={() => setPhPrcSearchBy('name')}
                    className="mr-2"
                  />
                  Name
                </label>
              </div>
            </div>
            {phPrcSearchBy === 'license' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={phPrcLicenseNo}
                    onChange={(e) => setPhPrcLicenseNo(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={phPrcDateOfBirth}
                    onChange={(e) => setPhPrcDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={phPrcFirstName}
                    onChange={(e) => setPhPrcFirstName(e.target.value)}
                    placeholder="e.g., Juan"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={phPrcLastName}
                    onChange={(e) => setPhPrcLastName(e.target.value)}
                    placeholder="e.g., DELA CRUZ"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            <Button
              variant="primary"
              onClick={handlePhPrc}
              disabled={isSubmittingPhPrc || !phPrcProfession.trim() || (phPrcSearchBy === 'license' ? (!phPrcLicenseNo.trim() || !phPrcDateOfBirth.trim()) : (!phPrcFirstName.trim() || !phPrcLastName.trim()))}
            >
              {isSubmittingPhPrc ? 'Verifying...' : 'Verify PRC License'}
            </Button>
            {phPrcResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(phPrcResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{phPrcResponse.id}</span></p>
              </div>
            )}
            {phPrcError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {phPrcError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {showPhNationalPolice && (
      <Card>
        <CardHeader>
          <CardTitle>PH National Police Clearance Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Surname
              </label>
              <input
                type="text"
                value={phNationalPoliceSurname}
                onChange={(e) => setPhNationalPoliceSurname(e.target.value)}
                placeholder="e.g., DELA CRUZ"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clearance Number
              </label>
              <input
                type="text"
                value={phNationalPoliceClearanceNo}
                onChange={(e) => setPhNationalPoliceClearanceNo(e.target.value)}
                placeholder="e.g., NP-123456-2024"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="primary"
              onClick={handlePhNationalPolice}
              disabled={isSubmittingPhNationalPolice || !phNationalPoliceSurname.trim() || !phNationalPoliceClearanceNo.trim()}
            >
              {isSubmittingPhNationalPolice ? 'Verifying...' : 'Verify National Police Clearance'}
            </Button>
            {phNationalPoliceResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(phNationalPoliceResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{phNationalPoliceResponse.id}</span></p>
              </div>
            )}
            {phNationalPoliceError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {phNationalPoliceError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {showPhNbi && (
      <Card>
        <CardHeader>
          <CardTitle>PH NBI Clearance Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clearance Number
              </label>
              <input
                type="text"
                value={phNbiClearanceNo}
                onChange={(e) => setPhNbiClearanceNo(e.target.value)}
                placeholder="e.g., N-1234567890-2024"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="primary"
              onClick={handlePhNbi}
              disabled={isSubmittingPhNbi || !phNbiClearanceNo.trim()}
            >
              {isSubmittingPhNbi ? 'Verifying...' : 'Verify NBI Clearance'}
            </Button>
            {phNbiResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(phNbiResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{phNbiResponse.id}</span></p>
              </div>
            )}
            {phNbiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {phNbiError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {showPhSss && (
      <Card>
        <CardHeader>
          <CardTitle>PH SSS Number Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SSS/CRN Number
              </label>
              <input
                type="text"
                value={phSssNumber}
                onChange={(e) => setPhSssNumber(e.target.value)}
                placeholder="e.g., 34-1234567-8"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="primary"
              onClick={handlePhSss}
              disabled={isSubmittingPhSss || !phSssNumber.trim()}
            >
              {isSubmittingPhSss ? 'Verifying...' : 'Verify SSS Number'}
            </Button>
            {phSssResponse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs"><span className="font-medium">Status:</span> {getStatusBadge(phSssResponse.status)}</p>
                <p className="text-xs mt-1"><span className="font-medium">ID:</span> <span className="font-mono">{phSssResponse.id}</span></p>
              </div>
            )}
            {phSssError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {phSssError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Document Verification */}
      {showDocument && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Verification</span>
            {lastDocResponse && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Last status: {lastDocResponse.status}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template</label>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  ID {selectedTemplateId}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used as templateId for submission</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front Image (JPG/PNG, ≤10MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handlePickFront(e.target.files?.[0])}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {docFrontDataUrl && (
                  <img src={docFrontDataUrl} alt="Front preview" className="mt-2 h-24 rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Back Image (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handlePickBack(e.target.files?.[0])}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {docBackDataUrl && (
                  <img src={docBackDataUrl} alt="Back preview" className="mt-2 h-24 rounded border border-gray-200 dark:border-gray-700 object-cover" />
                )}
              </div>
            </div>

            {docError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {docError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleSubmitDocument}
                disabled={isSubmittingDoc}
              >
                {isSubmittingDoc ? 'Submitting…' : 'Submit Document'}
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!verificationId) return
                  try {
                    const s = await verificationService.getStatus(verificationId)
                    setLastDocResponse(s)
                    if (s?.status) {
                      setVerificationStatus(s.status)
                      setVerification((prev) => (prev ? { ...prev, status: s.status } as any : prev))
                    }
                  } catch (e) {
                    // ignore for quick refresh
                  }
                }}
              >
                Refresh Status
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auth handled automatically (Bearer or X-API-Key). Do not send provider verification_id.
              </p>
            </div>

            {lastDocResponse && (
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <div><span className="font-medium">Response ID:</span> <span className="font-mono">{lastDocResponse.id}</span></div>
                <div className="mt-1"><span className="font-medium">Status:</span> {getStatusBadge(lastDocResponse.status)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

    </div>
  )
}

