interface FeedLayoutProps {
  children: React.ReactNode
  modal: React.ReactNode
}

const FeedLayout = ({ children, modal }: Readonly<FeedLayoutProps>) => {
  return (
    <>
      {children}
      {modal}
    </>
  )
}

export default FeedLayout
