import React from 'react'
import { render, screen } from "@testing-library/react"

/// Preferably each story instead of actual object
///
import { Default[NAME] } from './[NAME].stories'

const testID = "[NAME]-" + Math.floor(Math.random()*90000) + 10000

describe("[NAME]", () => {

    it("Can render [NAME]", () => {
        render(<Default[NAME] testID={ testID } />)
        let defaultCreated = screen.getByTestId(testID)
        expect(defaultCreated).not.toBeNull()
    })

})