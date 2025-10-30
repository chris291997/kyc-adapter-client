import { apiClient } from './apiClient'
import type { DocumentVerificationRequest, DocumentVerificationResponse } from '../types'

class VerificationService {
  async submitDocument(
    verificationId: string,
    payload: DocumentVerificationRequest
  ): Promise<DocumentVerificationResponse> {
    return apiClient.post<DocumentVerificationResponse>(
      `/verifications/${verificationId}/document`,
      payload
    )
  }

  async getStatus(verificationId: string): Promise<DocumentVerificationResponse> {
    return apiClient.get<DocumentVerificationResponse>(
      `/verifications/${verificationId}/status`
    )
  }
}

export const verificationService = new VerificationService()


