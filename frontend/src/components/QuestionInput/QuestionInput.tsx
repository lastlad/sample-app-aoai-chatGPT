import { useContext, useRef, useState } from 'react'
import { FontIcon, Stack, TextField } from '@fluentui/react'
import { SendRegular } from '@fluentui/react-icons'

import Send from '../../assets/Send.svg'

import styles from './QuestionInput.module.css'
import { ChatMessage } from '../../api'
import { AppStateContext } from '../../state/AppProvider'
import { resizeImage } from '../../utils/resizeImage'

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
  const [textFileName, setTextFileName] = useState<string | null>(null)
  const [textFileType, setTextFileType] = useState<string | null>(null)
  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRemoveFile = () => {
    setFile(null)
    setTextFileName('')
    setTextFileType('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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

      setFile(uploadedFile)

      if (['image/png', 'image/jpeg'].includes(uploadedFile.type)) {
        await convertToBase64(uploadedFile)
      } else if (uploadedFile.type === 'text/plain') {
        setTextFileName(uploadedFile.name)
        setTextFileType(uploadedFile.type)
        console.log('Text file uploaded:', uploadedFile.name)
      }
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

  const sendQuestion = () => {
    if (disabled || !question.trim()) {
      return
    }

    const questionTest: ChatMessage['content'] = base64Image
      ? [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      : file // Ensure file is not null before using it
        ? [
            { type: 'text', text: question },
            { type: 'file_attachment', file } // Now this is valid as file is guaranteed to be a File
          ]
        : question

    if (conversationId && questionTest !== undefined) {
      onSend(questionTest, conversationId)
      setBase64Image(null)
    } else {
      onSend(questionTest)
      setBase64Image(null)
    }

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
            onChange={event => handleFileUpload(event)}
            ref={fileInputRef}
            accept="image/*, .pdf, text/plain"
            className={styles.fileInput}
          />
          <label htmlFor="fileInput" className={styles.fileLabel} aria-label="Upload Image">
            <FontIcon className={styles.fileIcon} iconName={'PhotoCollection'} aria-label="Upload Image" />
          </label>
        </div>
      )}
      {base64Image && <img className={styles.uploadedImage} src={base64Image} alt="Uploaded Preview" />}
      {textFileName && (
        <div className={styles.fileName}>
          <div className={styles.fileInfo}>
            <p title={textFileName}>📎 File: {textFileName}</p>
            <p title={textFileName}>📄 Type: {textFileType}</p>
          </div>
          <button onClick={handleRemoveFile} className={styles.closeButton}>
            ❌
          </button>
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
