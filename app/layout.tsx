import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Didim PlayStation | Rezervasyon',description:'İki şube, tek rezervasyon ekranı. PlayStation masa ve seans yönetimi.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}

