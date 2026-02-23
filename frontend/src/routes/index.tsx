import { type FormEvent, type ReactNode, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle, Loader2, MapPin, Send } from 'lucide-react'
import { _jsonPostRequest } from '@/api/helpers'
import heroImage from '../assets/images/Boy and Dog.png'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SectionHeading } from '@/components/SectionHeading'
import { Pill } from '@/components/Pill'
import { ProjectCard } from '@/components/ProjectCard'
import { ExpandButton } from '@/components/ExpandButton'
import {
  profile,
  interests,
  projects,
  journey,
  education,
  socialLinks,
} from '@/data/portfolio'

export const Route = createFileRoute('/')({ component: Home })

const PREVIEW_LIMIT = 2

function Slide({ children }: { children: ReactNode }) {
  return (
    <section className="h-[100dvh] md:h-full shrink-0 snap-start snap-always px-6 md:px-8 md:pr-12 flex flex-col justify-center overflow-y-auto">
      <div className="max-w-2xl w-full">{children}</div>
    </section>
  )
}

function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      await _jsonPostRequest('contact', data)
      setStatus('success')
      formRef.current?.reset()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-card p-4 text-sm text-card-foreground">
        <CheckCircle className="size-4 text-green-500 shrink-0" />
        <span>Thanks for reaching out! I'll get back to you soon.</span>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Your name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="What's on your mind?"
          rows={4}
          required
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
      <Button type="submit" disabled={status === 'loading'} className="gap-2">
        {status === 'loading' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {status === 'loading' ? 'Sending...' : 'Send'}
      </Button>
    </form>
  )
}

function Slides() {
  return (
    <>
      {/* --- Opener --- */}
      <Slide>
        <div className="space-y-4">
          <p className="text-lg leading-relaxed text-foreground/90">
            {profile.opener.headline}
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            {profile.opener.body}
          </p>
          <p className="text-sm text-muted-foreground/70">
            {profile.name} — {profile.location}
          </p>
        </div>
      </Slide>

      {/* --- What I Enjoy --- */}
      <Slide>
        <div className="space-y-4">
          <SectionHeading>What I enjoy</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {interests.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </div>
      </Slide>

      {/* --- Things I've Built --- */}
      <Slide>
        <div className="space-y-4">
          <SectionHeading>Things I've built</SectionHeading>
          <div className="grid gap-4">
            {projects.slice(0, PREVIEW_LIMIT).map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
            <ExpandButton>See all projects</ExpandButton>
          </div>
        </div>
      </Slide>

      {/* --- Where I've Been --- */}
      <Slide>
        <div className="space-y-4">
          <SectionHeading>Where I've been</SectionHeading>
          <div className="space-y-1">
            {journey.slice(0, PREVIEW_LIMIT).map((stop) => (
              <div key={stop.period} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="size-2.5 rounded-full bg-primary mt-2" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="pb-4">
                  <p className="text-xs text-muted-foreground">{stop.period}</p>
                  <p className="font-semibold text-foreground">{stop.role}</p>
                  <p className="text-sm text-muted-foreground">
                    {stop.company}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground/80">
                    {stop.note}
                  </p>
                </div>
              </div>
            ))}
            <ExpandButton>See full experience</ExpandButton>
          </div>

          <div className="rounded-2xl bg-card p-5 space-y-2">
            <h3 className="font-semibold text-card-foreground text-sm">
              Education
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {education.map((ed) => (
                <p key={ed.institution}>
                  <span className="text-card-foreground font-medium">
                    {ed.institution}
                  </span>{' '}
                  — {ed.credential}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* --- Say Hi --- */}
      <Slide>
        <div className="space-y-6">
          <SectionHeading>{profile.contact.heading}</SectionHeading>
          <p className="text-sm text-muted-foreground">
            {profile.contact.intro}
          </p>

          <ContactForm />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-card-foreground">
              <MapPin className="size-4" />
              {profile.location}
            </span>
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-card-foreground transition-shadow hover:shadow-md"
              >
                <link.icon className="size-4" />
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60">
            {profile.languages}
          </p>
        </div>
      </Slide>
    </>
  )
}

function HeroImage({ className }: { className: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-36 rounded-2xl bg-muted animate-pulse" />
        </div>
      )}
      <img
        src={heroImage}
        alt="Boy and Dog"
        onLoad={() => setLoaded(true)}
        className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

function Home() {
  return (
    <>
      {/* Mobile — single full-page snap scroll */}
      <div className="h-[100dvh] overflow-y-auto snap-y snap-mandatory scrollbar-hidden md:hidden">
        <section className="h-[100dvh] shrink-0 snap-start snap-always flex items-center justify-center">
          <HeroImage className="h-64 w-auto object-contain" />
        </section>
        <Slides />
      </div>

      {/* Desktop — two-pane layout */}
      <div className="hidden md:flex h-screen overflow-hidden max-w-7xl mx-auto w-full">
        <div className="w-1/3 flex items-center justify-center p-8">
          <HeroImage className="h-[50vh] w-auto object-contain" />
        </div>
        <div className="w-2/3 overflow-y-auto snap-y snap-mandatory scrollbar-hidden">
          <Slides />
        </div>
      </div>
    </>
  )
}
