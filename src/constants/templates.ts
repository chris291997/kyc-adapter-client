// Static templates and plans mapping for modular FE configuration

export interface TemplateMapping {
  id: number
  name: string
  workflow_id: string
  dropzone_plans: number[]
}

export interface PlanMapping {
  id: number
  plan: string
}

export const TEMPLATES: TemplateMapping[] = [
  { id: 950, name: 'Philsys (Test 2)', workflow_id: '5RjH312mwEy1Yp9ZMsrbbE0m', dropzone_plans: [164] },
  { id: 839, name: 'One Foreign ID (Test)', workflow_id: 'rMgnza4ubdKbARXNPb4pXa1K', dropzone_plans: [166, 162] },
  { id: 838, name: 'Philsys (Test)', workflow_id: 'TIxdlW8deakF0MXE2AhMQrAZ', dropzone_plans: [164] },
  { id: 837, name: 'Two Philippine IDs (Test)', workflow_id: 'm7mg9S7bhLS9sLQCRV4huE2X', dropzone_plans: [166, 162] },
  { id: 456, name: 'Untitled 21/03/2025', workflow_id: 'I1QZl8LgU8P5Zs4lZXqbgBIK', dropzone_plans: [166, 162, 163] },
  { id: 426, name: 'Two Philippine IDs', workflow_id: '84CapPujDm7nRcfrnks8G3HO', dropzone_plans: [166, 162] },
  { id: 425, name: 'Philsys', workflow_id: 'h6I66fiQYCI20oPqIn7nB783', dropzone_plans: [164] },
  { id: 424, name: 'One Foreign ID', workflow_id: 'jjGoQapSKWFI1mGmRfaBdBSm', dropzone_plans: [166, 162] },
  { id: 306, name: 'First Philippine ID', workflow_id: 'TnN8SBDrfWXDOGZbmxvV56w2', dropzone_plans: [166] },
  
  // Test Templates for Individual Plan Testing
  // These templates are for testing plans that aren't used in existing templates
  { id: 1, name: '[TEST] Custom Document Only', workflow_id: 'TEST_CUSTOM_DOC_001', dropzone_plans: [161] },
  { id: 2, name: '[TEST] AML Only', workflow_id: 'TEST_AML_001', dropzone_plans: [165] },
  { id: 3, name: '[TEST] PH LTO Drivers License Only', workflow_id: 'TEST_PH_LTO_001', dropzone_plans: [167] },
  { id: 4, name: '[TEST] PH PRC License Only', workflow_id: 'TEST_PH_PRC_001', dropzone_plans: [168] },
  { id: 5, name: '[TEST] PH National Police Only', workflow_id: 'TEST_PH_NAT_POL_001', dropzone_plans: [169] },
  { id: 6, name: '[TEST] PH NBI Clearance Only', workflow_id: 'TEST_PH_NBI_001', dropzone_plans: [170] },
  { id: 7, name: '[TEST] PH SSS Number Only', workflow_id: 'TEST_PH_SSS_001', dropzone_plans: [171] },
]

export const PLANS: PlanMapping[] = [
  { id: 161, plan: 'custom_document' },
  { id: 162, plan: 'biometrics_verification' },
  { id: 163, plan: 'biometrics_face_compare' },
  { id: 164, plan: 'scan_qr' },
  { id: 165, plan: 'aml' },
  { id: 166, plan: 'document_verification' },
  { id: 167, plan: 'philippines_driving_license' },
  { id: 168, plan: 'philippines_prc' },
  { id: 169, plan: 'philippines_national_police' },
  { id: 170, plan: 'philippines_nbi_clearance' },
  { id: 171, plan: 'philippines_social_security' },
]

// Map plan IDs to which UI cards should render on ValidationPage
// Extend as more cards/features are added
export const PLAN_ID_TO_CARDS: Record<number, Array<
  'philsys_liveness' | 
  'document_verification' | 
  'biometrics_verification' | 
  'biometrics_face_compare' | 
  'biometrics_registration' |
  'custom_document' | 
  'ph_lto_drivers_license' | 
  'ph_prc' | 
  'ph_national_police' | 
  'ph_nbi' | 
  'ph_sss'
>> = {
  164: ['philsys_liveness'],
  166: ['document_verification'],
  // Biometrics verification plans
  161: ['custom_document'], // Custom Document Verification
  162: ['biometrics_verification'], // Biometric Verification
  163: ['biometrics_face_compare'], // Biometrics Face Match
  // Note: Biometrics Registration can be accessed via biometrics_verification card
  // Philippines government data verification endpoints - each has its own card type
  167: ['ph_lto_drivers_license'], // PH LTO Drivers License
  168: ['ph_prc'], // PH PRC License
  169: ['ph_national_police'], // PH National Police
  170: ['ph_nbi'], // PH NBI Clearance
  171: ['ph_sss'], // PH SSS Number
}




