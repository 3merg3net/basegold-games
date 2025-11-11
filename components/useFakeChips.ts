'use client'
import { useState } from 'react'
export function useFakeChips(initial:number=10000){const [chips,setChips]=useState(initial);return{chips,credit:(n:number)=>setChips(c=>c+n),debit:(n:number)=>setChips(c=>Math.max(0,c-n))}}