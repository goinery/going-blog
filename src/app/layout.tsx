import '@/styles/globals.css'

import type { Metadata } from 'next'
import Script from 'next/script'
import Layout from '@/layout'
import Head from '@/layout/head'
import siteContent from '@/config/site-content.json'

const {
	meta: { title, description },
	theme
} = siteContent

export const metadata: Metadata = {
	title,
	description,
	openGraph: {
		title,
		description
	},
	twitter: {
		title,
		description
	}
}

const htmlStyle = {
	cursor: 'url(/images/cursor.svg) 2 1, auto',
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='en' suppressHydrationWarning style={htmlStyle}>
			<Head />

			<body>
				<script
					dangerouslySetInnerHTML={{
						__html: `
					if (/windows|win32/i.test(navigator.userAgent)) {
						document.documentElement.classList.add('windows');
					}
		      `
					}}
				/>

				<Layout>{children}</Layout>

				<Script src="/live2d/TweenLite.js" strategy="afterInteractive" />
				<Script src="/live2d/live2dcubismcore.min.js" strategy="afterInteractive" />
				<Script src="/live2d/pixi.min.js" strategy="afterInteractive" />
				<Script src="/live2d/cubism4.min.js" strategy="afterInteractive" />
				<Script src="/live2d/pio.js" strategy="afterInteractive" />
				<Script src="/live2d/pio_sdk4.js" strategy="afterInteractive" />
				<Script src="/live2d/load.js" strategy="afterInteractive" />
			</body>
		</html>
	)
}
