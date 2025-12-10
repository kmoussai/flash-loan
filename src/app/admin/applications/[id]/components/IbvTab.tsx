import IbvCard from '../../../components/IbvCard'

interface IbvTabProps {
  applicationId: string
  onViewTransactions: (accountIndex: number | undefined) => void
}

const IbvTab = ({ applicationId, onViewTransactions }: IbvTabProps) => (
  <div className='flex h-full flex-col'>
    <IbvCard applicationId={applicationId} onViewTransactions={onViewTransactions} />
  </div>
)

export default IbvTab


