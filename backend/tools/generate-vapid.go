package main

import (
	"fmt"

	webpush "github.com/SherClockHolmes/webpush-go"
)

func main() {
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		panic(err)
	}

	fmt.Println("# Backend (.env)")
	fmt.Printf("VAPID_PUBLIC_KEY=%s\n", publicKey)
	fmt.Printf("VAPID_PRIVATE_KEY=%s\n", privateKey)
	fmt.Println("VAPID_SUBJECT=mailto:you@example.com")
	fmt.Println()
	fmt.Println("# Frontend (.env)")
	fmt.Printf("VITE_VAPID_PUBLIC_KEY=%s\n", publicKey)
}
