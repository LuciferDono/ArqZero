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
    <main className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center justify-between mb-16">
        <Link href="/" className="text-[#00D4AA] font-bold text-lg">◆ ArqZero</Link>
        <div className="flex gap-6 text-sm text-[#6B7280]">
          <Link href="/pricing" className="hover:text-[#00D4AA] transition-colors">pricing</Link>
          <Link href="/docs" className="hover:text-[#00D4AA] transition-colors">docs</Link>
          <Link href="/blog" className="text-[#00D4AA]">blog</Link>
        </div>
      </nav>

      <div className="text-[#6B7280] text-sm mb-8">$ arqzero --blog</div>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="block border border-[#1e1e1e] p-6 hover:border-[#00D4AA]/30 transition-colors">
            <div className="text-[#6B7280] text-xs mb-2">{post.date}</div>
            <h2 className="text-lg font-bold mb-2">{post.title}</h2>
            <p className="text-[#6B7280] text-sm">{post.summary}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
