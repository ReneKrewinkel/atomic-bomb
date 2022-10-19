import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

/// TODO: Define props
const [NAME] = (props) => {

    return(
        <div data-testid={ props.testID }
             data-object-type={ props.exceptionType ?? ""}
             className={ ["[NAME]", ...props.additionalClasses || []].join(" ") }>

        </div>
    )

}

/// TODO: Adjust!
const utilityClasses = [
    "red",
    "blue"
]

/// TODO: Adjust
const exceptionClasses = [
    "button",
    "regular"
]

    [NAME].propTypes = {
    testID: PropTypes.string,
    exceptionType: PropTypes.oneOf(exceptionClasses),
    utilityClasses: PropTypes.arrayOf(PropTypes.oneOf(utilityClasses)),
}

export default [NAME]