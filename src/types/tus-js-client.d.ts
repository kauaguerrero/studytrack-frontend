declare module 'tus-js-client' {
  export interface PreviousUpload {
    uploadUrl?: string | null
  }

  export interface UploadOptions {
    endpoint: string
    retryDelays?: number[]
    headers?: Record<string, string>
    metadata?: Record<string, string>
    onProgress?: (uploaded: number, total: number) => void
    onSuccess?: () => void
    onError?: (error: Error) => void
    onShouldRetry?: (error: Error) => boolean
  }

  export class Upload {
    constructor(file: File | Blob, options: UploadOptions)
    findPreviousUploads(): Promise<PreviousUpload[]>
    resumeFromPreviousUpload(upload: PreviousUpload): void
    start(): void
  }
}
