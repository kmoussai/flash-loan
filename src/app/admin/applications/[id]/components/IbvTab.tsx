import IbvCard from '../../../components/IbvCard'

interface IbvTabProps {
  applicationId: string
  clientId?: string
  onViewTransactions: (accountIndex: number | undefined) => void
}

const IbvTab = ({ applicationId, clientId, onViewTransactions }: IbvTabProps) => (
  <div className='flex h-full flex-col'>
    <IbvCard applicationId={applicationId} clientId={clientId} onViewTransactions={onViewTransactions} />
  </div>
)

export default IbvTab


