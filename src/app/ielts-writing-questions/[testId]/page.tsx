
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Test {
    id: string;
    title: string;
    question: string;
    sampleAnswer?: string;
}

// SSG: Generate paths for all tests at build time
export async function generateStaticParams() {
    const testsSnapshot = await getDocs(collection(db, 'tests'));
    return testsSnapshot.docs.map(doc => ({
        testId: doc.id
    }));
}

// SSG: Fetch data for a specific test
async function getTest(testId: string): Promise<Test | null> {
    const testDoc = await getDoc(doc(db, 'tests', testId));
    if (!testDoc.exists()) {
        return null;
    }
    const data = testDoc.data();
    return {
        id: testDoc.id,
        title: data.title,
        question: data.question,
        sampleAnswer: data.sampleAnswer,
    };
}

export async function generateMetadata({ params }: { params: { testId: string } }) {
  const test = await getTest(params.testId);
  if (!test) {
    return { title: 'Test not found' };
  }
  return {
    title: `${test.title} | IELTS Writing Question`,
    description: `Practice the IELTS writing question: ${test.title}. View a sample answer and get ready for your exam.`,
  };
}


export default async function PublicTestPage({ params }: { params: { testId: string } }) {
    const test = await getTest(params.testId);

    if (!test) {
        notFound();
    }
    
    // Schema.org JSON-LD for SEO
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Quiz",
        "name": test.title,
        "about": {
            "@type": "Thing",
            "name": "IELTS Writing Task"
        },
        "hasPart": {
            "@type": "Question",
            "name": test.title,
            "text": test.question.replace(/<[^>]*>?/gm, ''), // Plain text version of question
            "acceptedAnswer": {
                "@type": "Answer",
                "text": test.sampleAnswer?.replace(/<[^>]*>?/gm, '') || "A model answer is available on the platform."
            }
        }
    };


    return (
        <div className="bg-muted/40 py-12 md:py-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <h1 className="text-3xl font-bold font-headline">{test.title}</h1>
                            <p className="text-muted-foreground">IELTS Writing Practice Question</p>
                        </CardHeader>
                        <CardContent>
                           <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: test.question || ""}} />
                        </CardContent>
                    </Card>

                    {test.sampleAnswer && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Sample Answer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: test.sampleAnswer }}/>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-primary/5 border-primary/20 text-center">
                        <CardHeader>
                            <CardTitle className="font-headline">Ready to Test Your Skills?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">Get instant AI feedback or personalized guidance from an expert trainer.</p>
                            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                <Link href="/register">
                                    Practice this Test for Free <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
