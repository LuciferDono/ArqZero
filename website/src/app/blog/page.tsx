import Link from 'next/link';

const posts = [
  {
    slug: 'introducing-arqzero',
    title: 'Introducing ArqZero',
    date: '2026-03-23',
    summary: 'The terminal-native AI engineering agent that follows structured methodologies. Not a chatbot wrapper.',
  },
];

export default function Blog() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <nav className="flex items-center justify-between mb-16">
        <Link href="/" className="text-brand font-bold text-lg">◆ ArqZero</Link>
        <div className="flex gap-4 sm:gap-6 text-sm text-text-dim">
          <Link href="/pricing" className="hover:text-brand transition-colors py-1">pricing</Link>
          <Link href="/docs" className="hover:text-brand transition-colors py-1">docs</Link>
          <Link href="/blog" className="text-brand py-1">blog</Link>
        </div>
      </nav>

      <div className="text-text-dim text-sm mb-8">$ arqzero --blog</div>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="block border border-border p-6 hover:border-brand/30 transition-colors">
            <div className="text-text-dim text-xs mb-2">{post.date}</div>
            <h2 className="text-lg font-bold mb-2">{post.title}</h2>
            <p className="text-text-dim text-sm">{post.summary}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
