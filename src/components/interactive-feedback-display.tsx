
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CheckCircle, Zap } from "lucide-react";
import React from "react";

interface Feedback {
    overallBandScore: number;
    feedbackSummary: string;
    detailedFeedback: {
        descriptor: string;
        bandScore: number;
        feedback: string;
        suggestions: string[];
    }[];
    highlightedAnswer: string;
}

const parseHighlightedAnswer = (htmlString: string) => {
    if (typeof window === 'undefined') return []; // Don't run on server

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    
    return nodes.map((node, index) => {
        if (node.nodeName.toLowerCase() === 'mistake') {
            const element = node as HTMLElement;
            const type = element.getAttribute('type') || 'correction';
            const suggestion = element.getAttribute('suggestion') || 'No suggestion available.';
            const text = element.textContent || '';

            let colorClass = 'bg-yellow-200/50 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300';
            if (type === 'grammar') colorClass = 'bg-red-200/50 text-red-800 dark:bg-red-800/30 dark:text-red-300';
            if (type === 'spelling') colorClass = 'bg-blue-200/50 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300';
            if (type === 'lexis') colorClass = 'bg-green-200/50 text-green-800 dark:bg-green-800/30 dark:text-green-300';


            return (
                <Tooltip key={index}>
                    <TooltipTrigger asChild>
                        <span className={`px-1 rounded-md cursor-pointer ${colorClass}`}>
                            {text}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-center" side="top">
                        <p>{suggestion}</p>
                    </TooltipContent>
                </Tooltip>
            );
        }
        return <span key={index}>{node.textContent}</span>;
    });
};

export default function InteractiveFeedbackDisplay({ feedback }: { feedback: Feedback }) {
    
    return (
        <TooltipProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="text-center">
                        <CardDescription>Overall Band Score</CardDescription>
                        <CardTitle className="text-7xl font-bold text-primary">{feedback.overallBandScore.toFixed(1)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">{feedback.feedbackSummary}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Analysis</CardTitle>
                        <CardDescription>
                            Here's a breakdown of your score based on the official IELTS criteria.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
                            {feedback.detailedFeedback.map((item, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                        <div className="flex items-center gap-4">
                                            <span>{item.descriptor}</span>
                                            <span className="text-primary font-bold text-xl">{item.bandScore.toFixed(1)}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <p className="text-muted-foreground">{item.feedback}</p>
                                        <div>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> Suggestions for Improvement</h4>
                                            <ul className="space-y-2">
                                                {item.suggestions.map((suggestion, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 mt-1 shrink-0 text-green-500" />
                                                        <span>{suggestion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

// NOTE: The highlighted answer needs to be rendered on the results page itself, not within this component,
// because this component is inside a sticky container. The logic `parseHighlightedAnswer` is provided
// for use on that page. It is not used here to avoid layout issues.
