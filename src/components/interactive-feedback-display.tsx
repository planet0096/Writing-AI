
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

const descriptorColorMap: Record<string, string> = {
    "Task Achievement": "underline-purple-500",
    "Coherence and Cohesion": "underline-green-500",
    "Lexical Resource": "underline-blue-500",
    "Grammatical Range and Accuracy": "underline-red-500",
};

export const parseErrorString = (htmlString: string) => {
    if (typeof window === 'undefined') return []; // Don't run on server

    const parts = [];
    const regex = /<error (.*?)>(.*?)<\/error>/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(htmlString)) !== null) {
        // Text before the tag
        if (match.index > lastIndex) {
            parts.push(htmlString.substring(lastIndex, match.index));
        }

        const attrsString = match[1];
        const text = match[2];

        // Parse attributes
        const attrs = Array.from(attrsString.matchAll(/(\w+)="(.*?)"/g)).reduce((acc, attrMatch) => {
            acc[attrMatch[1]] = attrMatch[2];
            return acc;
        }, {} as Record<string, string>);

        parts.push({
            text,
            descriptor: attrs.descriptor,
            errorType: attrs.error_type,
            explanation: attrs.explanation,
            correction: attrs.correction,
        });

        lastIndex = regex.lastIndex;
    }

    // Text after the last tag
    if (lastIndex < htmlString.length) {
        parts.push(htmlString.substring(lastIndex));
    }

    return parts;
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
