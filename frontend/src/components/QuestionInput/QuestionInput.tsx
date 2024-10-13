import { useContext, useState } from 'react'
import { FontIcon, Stack, TextField } from '@fluentui/react'
import { SendRegular } from '@fluentui/react-icons'
import Send from '../../assets/Send.svg'

import styles from './QuestionInput.module.css'
import { ChatMessage } from '../../api'
import { AppStateContext } from '../../state/AppProvider'
import { resizeImage } from '../../utils/resizeImage'
import FileIcon from '../../assets/file_icon.svg'

interface Props {
  onSend: (question: ChatMessage['content'], id?: string, fileAttachment?: File) => void
  disabled: boolean
  placeholder?: string
  clearOnSend?: boolean
  conversationId?: string
  fileAttachment?: File | null
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
  const [question, setQuestion] = useState<string>('')
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [fileAttachment, setFileAttachment] = useState<File | null>(null)
  const [fileAttachmentName, setAttachmentName] = useState<string | null>(null)

  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]

    if (uploadedFile) {
      if (uploadedFile.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.')
        return
      }

      if (uploadedFile.type.startsWith('image/')) {
        await convertToBase64(uploadedFile)
      } else {
        setFileAttachment(uploadedFile)
        setAttachmentName(uploadedFile.name)
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

    const questionContent: ChatMessage["content"] = base64Image
      ? [{ type: "text", text: question }, { type: "image_url", image_url: { url: base64Image } }]
      : question.toString();

    if (conversationId && questionContent !== undefined) {
      onSend(questionContent, conversationId, fileAttachment || undefined)
    } else {
      onSend(questionContent, undefined, fileAttachment || undefined)
    }

    // Reset state
    setBase64Image(null)
    setFileAttachment(null)
    setAttachmentName(null)

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
            accept="image/*,text/plain,application/pdf"
            className={styles.fileInput}
          />
          <label htmlFor="fileInput" className={styles.fileLabel} aria-label="Upload File">
            <FontIcon className={styles.fileIcon} iconName={'Attach'} aria-label="Upload File" />
          </label>
        </div>
      )}
      {base64Image && <img className={styles.uploadedImage} src={base64Image} alt="Uploaded Preview" />}
      {fileAttachmentName && (
        <div className={`file-upload-section ${styles.fileName}`}>
          <img src={FileIcon} alt="File Icon"/>
          <p>Uploaded File: {fileAttachmentName}</p>
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
