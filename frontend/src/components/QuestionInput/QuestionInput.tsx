import { useContext, useState } from 'react'
import { FontIcon, Stack, TextField } from '@fluentui/react'
import { SendRegular } from '@fluentui/react-icons'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import Send from '../../assets/Send.svg'

import styles from './QuestionInput.module.css'
import { ChatMessage } from '../../api'
import { AppStateContext } from '../../state/AppProvider'
import { resizeImage } from '../../utils/resizeImage'

import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf'
import '@react-pdf-viewer/core/lib/styles/index.css'

// Use the same version for the worker
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`

interface Props {
  onSend: (question: ChatMessage['content'], id?: string) => void
  disabled: boolean
  placeholder?: string
  clearOnSend?: boolean
  conversationId?: string
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
  const [question, setQuestion] = useState<string>('')
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]

    if (uploadedFile) {
      if (uploadedFile.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.')
        return
      }
      if (!['image/png', 'image/jpeg', 'application/pdf', 'text/plain'].includes(uploadedFile.type)) {
        alert('Invalid file type. Please upload an image, PDF, or text file.')
        return
      }

      if (uploadedFile.type === 'application/pdf') {
        setPdfUrl(URL.createObjectURL(uploadedFile))

        const fileReader = new FileReader()
        fileReader.onload = async event => {
          const typedarray = new Uint8Array(event.target?.result as ArrayBuffer)
          try {
            const loadingTask = getDocument(typedarray)
            const pdf = await loadingTask.promise
            console.log(`PDF loaded. Number of pages: ${pdf.numPages}`)

            // Extracting text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              const textItems = textContent.items
              const text = textItems.map((item: any) => item.str).join(' ')
              console.log(`Page ${i}: ${text}`)
            }
          } catch (error) {
            console.error('Error loading PDF:', error)
          }
        }

        fileReader.readAsArrayBuffer(uploadedFile)
      } else {
        await convertToBase64(uploadedFile)
      }

      setFile(uploadedFile)
      await uploadFile(uploadedFile) // Make the API call
    }
  }

  const convertToBase64 = async (file: Blob) => {
    try {
      const resizedBase64 = await resizeImage(file, 800, 800)
      setBase64Image(resizedBase64)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const uploadFile = async (file: Blob) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${errorText}`)
      }

      const result = await response.json()
      console.log('File uploaded successfully:', result)
    } catch (error) {
      console.error('API call failed:', error)
      throw error // Rethrow to handle in the calling function
    }
  }

  const sendQuestion = () => {
    if (disabled || !question.trim()) {
      return
    }

    const questionContent: ChatMessage['content'] = base64Image
      ? [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      : question.toString()

    onSend(questionContent, conversationId)
    setBase64Image(null)
    setPdfUrl(null)
    setFile(null)

    if (clearOnSend) {
      setQuestion('')
    }
  }

  const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
      ev.preventDefault()
      sendQuestion()
    }
  }

  const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    setQuestion(newValue || '')
  }

  const sendQuestionDisabled = disabled || !question.trim()

  return (
    <Stack horizontal className={styles.questionInputContainer}>
      <TextField
        className={styles.questionInputTextArea}
        placeholder={placeholder}
        multiline
        resizable={false}
        borderless
        value={question}
        onChange={onQuestionChange}
        onKeyDown={onEnterPress}
      />
      {!OYD_ENABLED && (
        <div className={styles.fileInputContainer}>
          <input
            type="file"
            id="fileInput"
            onChange={handleFileUpload}
            accept="image/*, .pdf, text/plain"
            className={styles.fileInput}
          />
          <label htmlFor="fileInput" className={styles.fileLabel} aria-label="Upload Image">
            <FontIcon className={styles.fileIcon} iconName={'PhotoCollection'} aria-label="Upload Image" />
          </label>
        </div>
      )}
      {base64Image && <img className={styles.uploadedImage} src={base64Image} alt="Uploaded Preview" />}
      {pdfUrl && (
        <div className={styles.fileName}>
          <Worker workerUrl={GlobalWorkerOptions.workerSrc}>
            <Viewer fileUrl={pdfUrl} />
          </Worker>
          <p>Uploaded PDF: {file?.name}</p>
        </div>
      )}
      <div
        className={styles.questionInputSendButtonContainer}
        role="button"
        tabIndex={0}
        aria-label="Ask question button"
        onClick={sendQuestion}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? sendQuestion() : null)}>
        {sendQuestionDisabled ? (
          <SendRegular className={styles.questionInputSendButtonDisabled} />
        ) : (
          <img src={Send} className={styles.questionInputSendButton} alt="Send Button" />
        )}
      </div>
      <div className={styles.questionInputBottomBorder} />
    </Stack>
  )
}
