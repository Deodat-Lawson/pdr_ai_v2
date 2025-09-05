"use client"

import React, { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, TrendingUp, Eye, Search } from 'lucide-react';
import styles from '~/styles/Employer/Stats.module.css';

// Mock data for documents
const documents = [
    {
        id: 1,
        name: 'Financial Report Q4 2024.pdf',
        category: 'Financial',
        views: 245,
        lastViewed: '2025-01-15',
        trend: '+12%'
    },
    {
        id: 2,
        name: 'Employee Handbook 2025.pdf',
        category: 'HR',
        views: 187,
        lastViewed: '2025-01-14',
        trend: '+5%'
    },
    {
        id: 3,
        name: 'Project Roadmap 2025.pdf',
        category: 'Planning',
        views: 156,
        lastViewed: '2025-01-13',
        trend: '+8%'
    }
];

// Mock data for monthly views
const monthlyData = [
    { month: 'Jan', views: 420 },
    { month: 'Feb', views: 380 },
    { month: 'Mar', views: 550 },
    { month: 'Apr', views: 480 },
    { month: 'May', views: 620 },
    { month: 'Jun', views: 780 }
];

const DocumentStats: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState('6m');

    // Total views calculation
    const totalViews = documents.reduce((sum, doc) => sum + doc.views, 0);
    const averageViews = Math.round(totalViews / documents.length);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Document Statistics</h1>
                    <p className={styles.subtitle}>Track document engagement and performance</p>
                </div>
                <div className={styles.filters}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className={styles.timeframeSelect}
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                    >
                        <option value="1m">Last Month</option>
                        <option value="3m">Last 3 Months</option>
                        <option value="6m">Last 6 Months</option>
                        <option value="1y">Last Year</option>
                    </select>
                </div>
            </div>

            {/* Overview Cards */}
            <div className={styles.overviewCards}>
                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <div>
                            <p className={styles.cardLabel}>Total Views</p>
                            <h3 className={styles.cardValue}>{totalViews.toLocaleString()}</h3>
                        </div>
                        <Eye className={styles.cardIcon} />
                    </div>
                    <div className={styles.cardTrend}>
                        <TrendingUp className={styles.trendIcon} />
                        <span>+15% from last month</span>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <div>
                            <p className={styles.cardLabel}>Average Views</p>
                            <h3 className={styles.cardValue}>{averageViews.toLocaleString()}</h3>
                        </div>
                        <TrendingUp className={styles.cardIcon} />
                    </div>
                    <div className={styles.cardTrend}>
                        <TrendingUp className={styles.trendIcon} />
                        <span>+8% from last month</span>
                    </div>
                </div>
            </div>

            {/* Monthly Views Chart */}
            <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>Monthly View Trends</h2>
                <div className={styles.chart}>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="views"
                                stroke="#7C3AED"
                                strokeWidth={2}
                                dot={{ fill: '#7C3AED' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Document List */}
            <div className={styles.documentList}>
                <h2 className={styles.sectionTitle}>Document Performance</h2>
                <div className={styles.table}>
                    <div className={styles.tableHeader}>
                        <div className={styles.tableCell}>Document</div>
                        <div className={styles.tableCell}>Category</div>
                        <div className={styles.tableCell}>Views</div>
                        <div className={styles.tableCell}>Last Viewed</div>
                        <div className={styles.tableCell}>Trend</div>
                    </div>
                    {documents.map(doc => (
                        <div key={doc.id} className={styles.tableRow}>
                            <div className={`${styles.tableCell} ${styles.documentCell}`}>
                                <FileText className={styles.documentIcon} />
                                {doc.name}
                            </div>
                            <div className={styles.tableCell}>{doc.category}</div>
                            <div className={styles.tableCell}>{doc.views.toLocaleString()}</div>
                            <div className={styles.tableCell}>{doc.lastViewed}</div>
                            <div className={`${styles.tableCell} ${styles.trendCell}`}>
                                <span className={styles.trendValue}>{doc.trend}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DocumentStats;