import DocumentsSection from '../../../components/DocumentsSection'

interface DocumentsTabProps {
  clientId: string
  applicationId: string
}

const DocumentsTab = ({ clientId, applicationId }: DocumentsTabProps) => (
  <div>
    <DocumentsSection clientId={clientId} applicationId={applicationId} />
  </div>
)

export default DocumentsTab


