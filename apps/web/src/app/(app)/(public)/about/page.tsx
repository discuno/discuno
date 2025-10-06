const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="text-primary text-5xl font-bold">About Discuno</h1>
        <p className="text-muted-foreground mt-4 text-xl">
          Connecting students and mentors for a brighter future.
        </p>
      </header>

      <main>
        <section className="mb-16">
          <h2 className="mb-4 text-center text-3xl font-semibold">Our Mission</h2>
          <p className="mx-auto max-w-3xl text-center text-lg">
            At Discuno, our mission is to bridge the gap between aspiring students and experienced
            mentors. We believe that guidance and mentorship are crucial for personal and
            professional growth. Our platform provides a space for students to connect with mentors
            who can provide valuable insights, advice, and support.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold">Our Team</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="bg-muted mx-auto mb-4 h-32 w-32 rounded-full"></div>
              <h3 className="text-xl font-bold">Brad</h3>
              <p className="text-muted-foreground">Founder & CEO</p>
            </div>
            <div className="text-center">
              <div className="bg-muted mx-auto mb-4 h-32 w-32 rounded-full"></div>
              <h3 className="text-xl font-bold">Roo</h3>
              <p className="text-muted-foreground">Lead Developer</p>
            </div>
            <div className="text-center">
              <div className="bg-muted mx-auto mb-4 h-32 w-32 rounded-full"></div>
              <h3 className="text-xl font-bold">User</h3>
              <p className="text-muted-foreground">Product Manager</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AboutPage
